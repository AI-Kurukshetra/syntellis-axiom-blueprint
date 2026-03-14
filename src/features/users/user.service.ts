import type {
  Department,
  Facility,
  Json,
  OrganizationUserDirectory,
  OrganizationUserDirectoryEntry,
  Role,
  ServiceLine,
  TableInsert,
  UserDepartmentAssignment,
  UserDepartmentAssignmentInput,
  UserFacilityAssignment,
  UserFacilityAssignmentInput,
  UserInvitationResult,
  UserInviteInput,
  UserProfile,
  UserProfileReviewInput,
  UserRoleAssignment,
  UserRoleAssignmentInput,
  UserScopedDepartmentAssignment,
  UserScopedFacilityAssignment,
  UserScopedRoleAssignment,
} from "@/types";

import { env } from "@/lib/env";
import { safeLogAuditEvent } from "@/lib/audit";
import { requireAdminAccess } from "@/lib/auth/authorization";
import { ForbiddenError, NotFoundError } from "@/lib/http-errors";
import { organizationRepository } from "@/lib/repositories/organization.repository";
import { profileRepository } from "@/lib/repositories/profile.repository";
import { roleRepository } from "@/lib/repositories/role.repository";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

function normalizeOptionalText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeOptionalDateTime(value?: string | null) {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  const timestamp = new Date(normalized);

  if (Number.isNaN(timestamp.getTime())) {
    throw new Error("Enter a valid date and time.");
  }

  return timestamp.toISOString();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function asObjectJson(value: Json | undefined): Record<string, Json> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, Json>;
}

function getRoleAssignmentScopeKey(assignment: {
  role_id: string;
  facility_id: string | null;
  department_id: string | null;
  service_line_id: string | null;
}) {
  return [assignment.role_id, assignment.facility_id ?? "", assignment.department_id ?? "", assignment.service_line_id ?? ""].join("::");
}

function dedupeRoles(roles: Array<Role | null>) {
  const roleMap = new Map<string, Role>();

  roles.forEach((role) => {
    if (role) {
      roleMap.set(role.id, role);
    }
  });

  return [...roleMap.values()];
}

function buildScopedRoleAssignment(
  assignment: UserRoleAssignment,
  rolesById: Map<string, Role>,
  facilitiesById: Map<string, Facility>,
  departmentsById: Map<string, Department>,
  serviceLinesById: Map<string, ServiceLine>
): UserScopedRoleAssignment {
  return {
    assignment,
    role: rolesById.get(assignment.role_id) ?? null,
    facility: assignment.facility_id ? facilitiesById.get(assignment.facility_id) ?? null : null,
    department: assignment.department_id ? departmentsById.get(assignment.department_id) ?? null : null,
    serviceLine: assignment.service_line_id ? serviceLinesById.get(assignment.service_line_id) ?? null : null,
  };
}

function buildScopedFacilityAssignment(
  assignment: UserFacilityAssignment,
  facilitiesById: Map<string, Facility>,
  serviceLinesById: Map<string, ServiceLine>
): UserScopedFacilityAssignment {
  const facility = facilitiesById.get(assignment.facility_id) ?? null;

  return {
    assignment,
    facility,
    serviceLine: facility?.service_line_id ? serviceLinesById.get(facility.service_line_id) ?? null : null,
  };
}

function buildScopedDepartmentAssignment(
  assignment: UserDepartmentAssignment,
  departmentsById: Map<string, Department>,
  facilitiesById: Map<string, Facility>,
  serviceLinesById: Map<string, ServiceLine>
): UserScopedDepartmentAssignment {
  const department = departmentsById.get(assignment.department_id) ?? null;
  const facility = department ? facilitiesById.get(department.facility_id) ?? null : null;

  return {
    assignment,
    department,
    facility,
    serviceLine: department?.service_line_id ? serviceLinesById.get(department.service_line_id) ?? null : null,
  };
}

function mapProfilesToDirectoryEntries(
  profiles: UserProfile[],
  roleAssignmentsByUserId: Map<string, UserRoleAssignment[]>,
  facilityAssignmentsByUserId: Map<string, UserFacilityAssignment[]>,
  departmentAssignmentsByUserId: Map<string, UserDepartmentAssignment[]>,
  rolesById: Map<string, Role>,
  facilitiesById: Map<string, Facility>,
  departmentsById: Map<string, Department>,
  serviceLinesById: Map<string, ServiceLine>
) {
  return profiles.map((profile) => {
    const roleAssignments = roleAssignmentsByUserId.get(profile.id) ?? [];
    const scopedRoleAssignments = roleAssignments.map((assignment) =>
      buildScopedRoleAssignment(assignment, rolesById, facilitiesById, departmentsById, serviceLinesById)
    );
    const facilityAssignments = facilityAssignmentsByUserId.get(profile.id) ?? [];
    const scopedFacilityAssignments = facilityAssignments.map((assignment) =>
      buildScopedFacilityAssignment(assignment, facilitiesById, serviceLinesById)
    );
    const departmentAssignments = departmentAssignmentsByUserId.get(profile.id) ?? [];
    const scopedDepartmentAssignments = departmentAssignments.map((assignment) =>
      buildScopedDepartmentAssignment(assignment, departmentsById, facilitiesById, serviceLinesById)
    );

    return {
      profile,
      roles: dedupeRoles(scopedRoleAssignments.map((assignment) => assignment.role)),
      roleAssignments,
      scopedRoleAssignments,
      facilityAssignments,
      scopedFacilityAssignments,
      departmentAssignments,
      scopedDepartmentAssignments,
    } satisfies OrganizationUserDirectoryEntry;
  });
}

function buildInvitedProfileInsert(profile: UserProfile | null, input: UserInviteInput, userId: string, organizationId: string, invitedBy: string) {
  return {
    id: userId,
    organization_id: organizationId,
    full_name: input.fullName.trim(),
    work_email: normalizeEmail(input.email),
    title: normalizeOptionalText(input.title),
    status: "pending",
    phone_number: profile?.phone_number ?? null,
    mfa_required: profile?.mfa_required ?? false,
    last_sign_in_at: profile?.last_sign_in_at ?? null,
    invited_by: invitedBy,
    metadata: {
      ...asObjectJson(profile?.metadata),
      invited_role_slug: input.roleSlug,
      invitation_sent_at: new Date().toISOString(),
    } satisfies Json,
  } satisfies TableInsert<"profiles">;
}

async function requireOrganizationAdminContext() {
  const currentUser = await requireAdminAccess();
  const organizationId = currentUser.profile?.organization_id;

  if (!organizationId || !currentUser.organization) {
    throw new ForbiddenError("An organization context is required to manage users.");
  }

  return {
    currentUser,
    organizationId,
    organization: currentUser.organization,
  };
}

async function requireProfileInOrganization(userId: string, organizationId: string) {
  const adminClient = getSupabaseAdminClient();
  const profile = await profileRepository.getProfileByUserId(adminClient, userId);

  if (!profile || profile.organization_id !== organizationId) {
    throw new NotFoundError("The selected user does not exist in the current organization.");
  }

  return profile;
}

async function requireFacilityInOrganization(facilityId: string, organizationId: string) {
  const adminClient = getSupabaseAdminClient();
  const facility = await organizationRepository.getFacilityById(adminClient, facilityId);

  if (!facility || facility.organization_id !== organizationId) {
    throw new NotFoundError("The selected facility does not exist in the current organization.");
  }

  return facility;
}

async function requireDepartmentInOrganization(departmentId: string, organizationId: string) {
  const adminClient = getSupabaseAdminClient();
  const department = await organizationRepository.getDepartmentById(adminClient, departmentId);

  if (!department || department.organization_id !== organizationId) {
    throw new NotFoundError("The selected department does not exist in the current organization.");
  }

  return department;
}

async function requireServiceLineInOrganization(serviceLineId: string, organizationId: string) {
  const adminClient = getSupabaseAdminClient();
  const serviceLine = await organizationRepository.getServiceLineById(adminClient, serviceLineId);

  if (!serviceLine || serviceLine.organization_id !== organizationId) {
    throw new NotFoundError("The selected service line does not exist in the current organization.");
  }

  return serviceLine;
}

async function requireAssignableRole(roleId: string, organizationId: string) {
  const adminClient = getSupabaseAdminClient();
  const role = await roleRepository.getRoleById(adminClient, roleId);

  if (!role || (role.organization_id && role.organization_id !== organizationId)) {
    throw new NotFoundError("The selected role does not exist in the current scope.");
  }

  if (role.scope_level === "global") {
    throw new Error("Global roles cannot be assigned from the tenant admin workspace.");
  }

  return role;
}

async function requireRoleAssignmentInOrganization(assignmentId: string, organizationId: string) {
  const adminClient = getSupabaseAdminClient();
  const assignment = await roleRepository.getUserRoleAssignmentById(adminClient, assignmentId);

  if (!assignment || assignment.organization_id !== organizationId) {
    throw new NotFoundError("The selected role assignment does not exist in the current organization.");
  }

  return assignment;
}

async function requireFacilityAssignmentInOrganization(assignmentId: string, organizationId: string) {
  const adminClient = getSupabaseAdminClient();
  const assignment = await profileRepository.getFacilityAssignmentById(adminClient, assignmentId);

  if (!assignment) {
    throw new NotFoundError("The selected facility assignment was not found.");
  }

  await Promise.all([
    requireProfileInOrganization(assignment.user_id, organizationId),
    requireFacilityInOrganization(assignment.facility_id, organizationId),
  ]);

  return assignment;
}

async function requireDepartmentAssignmentInOrganization(assignmentId: string, organizationId: string) {
  const adminClient = getSupabaseAdminClient();
  const assignment = await profileRepository.getDepartmentAssignmentById(adminClient, assignmentId);

  if (!assignment) {
    throw new NotFoundError("The selected department assignment was not found.");
  }

  await Promise.all([
    requireProfileInOrganization(assignment.user_id, organizationId),
    requireDepartmentInOrganization(assignment.department_id, organizationId),
  ]);

  return assignment;
}

type ResolvedRoleScope = {
  facility: Facility | null;
  department: Department | null;
  serviceLine: ServiceLine | null;
  facilityId: string | null;
  departmentId: string | null;
  serviceLineId: string | null;
};

async function resolveRoleAssignmentScope(role: Role, input: UserRoleAssignmentInput, organizationId: string): Promise<ResolvedRoleScope> {
  switch (role.scope_level) {
    case "organization":
      return {
        facility: null,
        department: null,
        serviceLine: null,
        facilityId: null,
        departmentId: null,
        serviceLineId: null,
      };
    case "facility": {
      if (!input.facilityId) {
        throw new Error("Facility-scoped roles require a facility selection.");
      }

      const facility = await requireFacilityInOrganization(input.facilityId, organizationId);

      return {
        facility,
        department: null,
        serviceLine: null,
        facilityId: facility.id,
        departmentId: null,
        serviceLineId: null,
      };
    }
    case "department": {
      if (!input.departmentId) {
        throw new Error("Department-scoped roles require a department selection.");
      }

      const department = await requireDepartmentInOrganization(input.departmentId, organizationId);

      if (input.facilityId && input.facilityId !== department.facility_id) {
        throw new Error("The selected department belongs to a different facility.");
      }

      return {
        facility: await requireFacilityInOrganization(department.facility_id, organizationId),
        department,
        serviceLine: department.service_line_id ? await requireServiceLineInOrganization(department.service_line_id, organizationId) : null,
        facilityId: department.facility_id,
        departmentId: department.id,
        serviceLineId: department.service_line_id,
      };
    }
    case "service_line": {
      if (!input.serviceLineId) {
        throw new Error("Service-line-scoped roles require a service line selection.");
      }

      const serviceLine = await requireServiceLineInOrganization(input.serviceLineId, organizationId);
      const facility = serviceLine.facility_id ? await requireFacilityInOrganization(serviceLine.facility_id, organizationId) : null;

      return {
        facility,
        department: null,
        serviceLine,
        facilityId: facility?.id ?? null,
        departmentId: null,
        serviceLineId: serviceLine.id,
      };
    }
    default:
      throw new Error("The selected role scope is not supported by the current assignment workflow.");
  }
}

export async function listOrganizationUsers(limit = 50): Promise<OrganizationUserDirectory> {
  const { organizationId, organization } = await requireOrganizationAdminContext();
  const client = await getSupabaseServerClient();
  const [profiles, roles, roleAssignments, facilities, departments, serviceLines] = await Promise.all([
    profileRepository.listProfilesByOrganization(client, organizationId, limit),
    roleRepository.listRoles(client, organizationId),
    roleRepository.listRoleAssignmentsByOrganization(client, organizationId),
    organizationRepository.listFacilities(client, organizationId, limit),
    organizationRepository.listDepartments(client, organizationId, limit),
    organizationRepository.listServiceLines(client, organizationId, limit),
  ]);

  const userIds = profiles.map((profile) => profile.id);
  const [facilityAssignments, departmentAssignments] = await Promise.all([
    profileRepository.listFacilityAssignmentsByUserIds(client, userIds),
    profileRepository.listDepartmentAssignmentsByUserIds(client, userIds),
  ]);

  const roleAssignmentsByUserId = new Map<string, UserRoleAssignment[]>();
  roleAssignments.forEach((assignment) => {
    const entries = roleAssignmentsByUserId.get(assignment.user_id) ?? [];
    entries.push(assignment);
    roleAssignmentsByUserId.set(assignment.user_id, entries);
  });

  const facilityAssignmentsByUserId = new Map<string, UserFacilityAssignment[]>();
  facilityAssignments.forEach((assignment) => {
    const entries = facilityAssignmentsByUserId.get(assignment.user_id) ?? [];
    entries.push(assignment);
    facilityAssignmentsByUserId.set(assignment.user_id, entries);
  });

  const departmentAssignmentsByUserId = new Map<string, UserDepartmentAssignment[]>();
  departmentAssignments.forEach((assignment) => {
    const entries = departmentAssignmentsByUserId.get(assignment.user_id) ?? [];
    entries.push(assignment);
    departmentAssignmentsByUserId.set(assignment.user_id, entries);
  });

  const rolesById = new Map(roles.map((role) => [role.id, role] as const));
  const facilitiesById = new Map(facilities.map((facility) => [facility.id, facility] as const));
  const departmentsById = new Map(departments.map((department) => [department.id, department] as const));
  const serviceLinesById = new Map(serviceLines.map((serviceLine) => [serviceLine.id, serviceLine] as const));

  return {
    organization,
    availableRoles: roles,
    availableFacilities: facilities,
    availableDepartments: departments,
    availableServiceLines: serviceLines,
    users: mapProfilesToDirectoryEntries(
      profiles,
      roleAssignmentsByUserId,
      facilityAssignmentsByUserId,
      departmentAssignmentsByUserId,
      rolesById,
      facilitiesById,
      departmentsById,
      serviceLinesById
    ),
  };
}

export async function inviteUserToOrganization(input: UserInviteInput): Promise<UserInvitationResult> {
  const { currentUser, organizationId } = await requireOrganizationAdminContext();
  const adminClient = getSupabaseAdminClient();
  const email = normalizeEmail(input.email);
  const existingProfile = await profileRepository.getProfileByWorkEmail(adminClient, email);

  if (existingProfile?.organization_id && existingProfile.organization_id !== organizationId) {
    throw new Error("This email is already assigned to a different organization.");
  }

  if (existingProfile?.organization_id === organizationId) {
    throw new Error("This user already belongs to the current organization.");
  }

  const role =
    (await roleRepository.getRoleBySlug(adminClient, input.roleSlug, organizationId)) ??
    (await roleRepository.getRoleBySlug(adminClient, input.roleSlug));

  if (!role) {
    throw new NotFoundError("The selected role was not found.");
  }

  if (role.scope_level !== "organization") {
    throw new Error("Only organization-scoped roles can be assigned during invitation. Use scoped assignment management for facility or department roles.");
  }

  const redirectTo = new URL("/auth/confirm?next=/workspace", env.appUrl).toString();
  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: {
      name: input.fullName.trim(),
      invited_organization_id: organizationId,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  const invitedUserId = data.user?.id;

  if (!invitedUserId) {
    throw new Error("Supabase did not return the invited user identifier.");
  }

  const refreshedProfile = await profileRepository.getProfileByUserId(adminClient, invitedUserId);
  await profileRepository.upsertProfile(
    adminClient,
    buildInvitedProfileInsert(refreshedProfile, input, invitedUserId, organizationId, currentUser.authUser.id)
  );

  await roleRepository.createUserRoleAssignment(adminClient, {
    organization_id: organizationId,
    user_id: invitedUserId,
    role_id: role.id,
    scope_level: role.scope_level,
    facility_id: null,
    department_id: null,
    service_line_id: null,
    assigned_by: currentUser.authUser.id,
    starts_at: new Date().toISOString(),
    ends_at: null,
  });

  const invitationSentAt = new Date().toISOString();

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "user.invited",
    entityType: "profile",
    entityId: invitedUserId,
    scopeLevel: "organization",
    metadata: {
      email,
      role_slug: role.slug,
      role_scope_level: role.scope_level,
      invited_user_id: invitedUserId,
    },
  });

  return {
    userId: invitedUserId,
    email,
    organizationId,
    role,
    invitationSentAt,
  };
}

export async function reviewOrganizationUserProfile(input: UserProfileReviewInput) {
  const { currentUser, organizationId } = await requireOrganizationAdminContext();
  const adminClient = getSupabaseAdminClient();
  const profile = await requireProfileInOrganization(input.userId, organizationId);
  const updatedProfile = await profileRepository.updateProfile(adminClient, input.userId, {
    full_name: normalizeOptionalText(input.fullName),
    title: normalizeOptionalText(input.title),
    status: input.status,
  });

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "profile.reviewed",
    entityType: "profile",
    entityId: updatedProfile.id,
    scopeLevel: "organization",
    metadata: {
      previous_status: profile.status,
      status: updatedProfile.status,
      title: updatedProfile.title,
    },
  });

  return updatedProfile;
}

export async function assignRoleToOrganizationUser(input: UserRoleAssignmentInput) {
  const { currentUser, organizationId } = await requireOrganizationAdminContext();
  const adminClient = getSupabaseAdminClient();
  await requireProfileInOrganization(input.userId, organizationId);
  const role = await requireAssignableRole(input.roleId, organizationId);
  const resolvedScope = await resolveRoleAssignmentScope(role, input, organizationId);
  const existingAssignments = await roleRepository.listUserRoleAssignments(adminClient, input.userId, organizationId);
  const duplicateAssignment = existingAssignments.find(
    (assignment) =>
      getRoleAssignmentScopeKey(assignment) ===
      getRoleAssignmentScopeKey({
        role_id: role.id,
        facility_id: resolvedScope.facilityId,
        department_id: resolvedScope.departmentId,
        service_line_id: resolvedScope.serviceLineId,
      })
  );

  if (duplicateAssignment) {
    throw new Error("This role assignment already exists for the selected scope.");
  }

  const assignment = await roleRepository.createUserRoleAssignment(adminClient, {
    organization_id: organizationId,
    user_id: input.userId,
    role_id: role.id,
    scope_level: role.scope_level,
    facility_id: resolvedScope.facilityId,
    department_id: resolvedScope.departmentId,
    service_line_id: resolvedScope.serviceLineId,
    assigned_by: currentUser.authUser.id,
    starts_at: normalizeOptionalDateTime(input.startsAt) ?? new Date().toISOString(),
    ends_at: normalizeOptionalDateTime(input.endsAt),
  });

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "user.role_assignment_created",
    entityType: "user_role_assignment",
    entityId: assignment.id,
    scopeLevel: role.scope_level,
    facilityId: assignment.facility_id,
    departmentId: assignment.department_id,
    metadata: {
      user_id: input.userId,
      role_id: role.id,
      role_slug: role.slug,
      service_line_id: assignment.service_line_id,
    },
  });

  return assignment;
}

export async function revokeRoleAssignment(assignmentId: string) {
  const { currentUser, organizationId } = await requireOrganizationAdminContext();
  const adminClient = getSupabaseAdminClient();
  const assignment = await requireRoleAssignmentInOrganization(assignmentId, organizationId);
  const deletedAssignment = await roleRepository.deleteUserRoleAssignment(adminClient, assignmentId);

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "user.role_assignment_removed",
    entityType: "user_role_assignment",
    entityId: deletedAssignment.id,
    scopeLevel: deletedAssignment.scope_level,
    facilityId: deletedAssignment.facility_id,
    departmentId: deletedAssignment.department_id,
    metadata: {
      user_id: deletedAssignment.user_id,
      role_id: deletedAssignment.role_id,
      service_line_id: deletedAssignment.service_line_id,
    },
  });

  return assignment;
}

export async function assignFacilityToOrganizationUser(input: UserFacilityAssignmentInput) {
  const { currentUser, organizationId } = await requireOrganizationAdminContext();
  const adminClient = getSupabaseAdminClient();
  await requireProfileInOrganization(input.userId, organizationId);
  const facility = await requireFacilityInOrganization(input.facilityId, organizationId);
  const existingAssignments = await profileRepository.listFacilityAssignments(adminClient, input.userId);

  if (existingAssignments.some((assignment) => assignment.facility_id === input.facilityId)) {
    throw new Error("This facility is already assigned to the selected user.");
  }

  const assignment = await profileRepository.createFacilityAssignment(adminClient, {
    user_id: input.userId,
    facility_id: input.facilityId,
  });

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "user.facility_assignment_created",
    entityType: "user_facility_assignment",
    entityId: assignment.id,
    scopeLevel: "facility",
    facilityId: facility.id,
    metadata: {
      user_id: input.userId,
      facility_code: facility.code,
    },
  });

  return assignment;
}

export async function revokeFacilityAssignment(assignmentId: string) {
  const { currentUser, organizationId } = await requireOrganizationAdminContext();
  const adminClient = getSupabaseAdminClient();
  const assignment = await requireFacilityAssignmentInOrganization(assignmentId, organizationId);
  const deletedAssignment = await profileRepository.deleteFacilityAssignment(adminClient, assignmentId);

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "user.facility_assignment_removed",
    entityType: "user_facility_assignment",
    entityId: deletedAssignment.id,
    scopeLevel: "facility",
    facilityId: deletedAssignment.facility_id,
    metadata: {
      user_id: deletedAssignment.user_id,
    },
  });

  return assignment;
}

export async function assignDepartmentToOrganizationUser(input: UserDepartmentAssignmentInput) {
  const { currentUser, organizationId } = await requireOrganizationAdminContext();
  const adminClient = getSupabaseAdminClient();
  await requireProfileInOrganization(input.userId, organizationId);
  const department = await requireDepartmentInOrganization(input.departmentId, organizationId);
  const existingAssignments = await profileRepository.listDepartmentAssignments(adminClient, input.userId);

  if (existingAssignments.some((assignment) => assignment.department_id === input.departmentId)) {
    throw new Error("This department is already assigned to the selected user.");
  }

  const assignment = await profileRepository.createDepartmentAssignment(adminClient, {
    user_id: input.userId,
    department_id: input.departmentId,
  });

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "user.department_assignment_created",
    entityType: "user_department_assignment",
    entityId: assignment.id,
    scopeLevel: "department",
    facilityId: department.facility_id,
    departmentId: department.id,
    metadata: {
      user_id: input.userId,
      department_code: department.code,
    },
  });

  return assignment;
}

export async function revokeDepartmentAssignment(assignmentId: string) {
  const { currentUser, organizationId } = await requireOrganizationAdminContext();
  const adminClient = getSupabaseAdminClient();
  const assignment = await requireDepartmentAssignmentInOrganization(assignmentId, organizationId);
  const deletedAssignment = await profileRepository.deleteDepartmentAssignment(adminClient, assignmentId);
  const department = await requireDepartmentInOrganization(deletedAssignment.department_id, organizationId);

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "user.department_assignment_removed",
    entityType: "user_department_assignment",
    entityId: deletedAssignment.id,
    scopeLevel: "department",
    facilityId: department.facility_id,
    departmentId: department.id,
    metadata: {
      user_id: deletedAssignment.user_id,
    },
  });

  return assignment;
}
