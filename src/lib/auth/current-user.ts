import { cache } from "react";

import type { CurrentUserContext, PermissionCode, Role } from "@/types";

import { syncProfileFromAuthUser } from "@/lib/auth/profile-sync";
import { UnauthorizedError } from "@/lib/http-errors";
import { profileRepository } from "@/lib/repositories/profile.repository";
import { RepositoryError } from "@/lib/repositories/base";
import { organizationRepository } from "@/lib/repositories/organization.repository";
import { roleRepository } from "@/lib/repositories/role.repository";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

function isActiveRoleAssignment(startsAt: string, endsAt: string | null) {
  const now = Date.now();
  const startsAtTime = new Date(startsAt).getTime();
  const endsAtTime = endsAt ? new Date(endsAt).getTime() : Number.POSITIVE_INFINITY;

  return startsAtTime <= now && endsAtTime >= now;
}

const fallbackSystemRolePermissions: Partial<Record<string, PermissionCode[]>> = {
  "executive-user": ["dashboard.view", "analytics.view"],
  "finance-analyst": ["dashboard.view", "analytics.view", "reports.manage"],
  "clinical-quality-manager": ["dashboard.view", "analytics.view", "alerts.manage", "reports.manage"],
  "operations-manager": ["dashboard.view", "analytics.view", "alerts.manage"],
  "department-manager": ["dashboard.view", "analytics.view", "alerts.manage", "reports.manage"],
  "compliance-officer": ["compliance.view", "reports.manage"],
  "system-administrator": [
    "dashboard.view",
    "analytics.view",
    "reports.manage",
    "alerts.manage",
    "compliance.view",
    "integrations.manage",
    "admin.manage",
  ],
  "data-engineer": ["integrations.manage", "dashboard.view", "analytics.view", "reports.manage"],
};

function getFallbackPermissionCodes(roles: Role[]) {
  return roles.flatMap((role) => fallbackSystemRolePermissions[role.slug] ?? []);
}

export const getCurrentUserContext = cache(async (): Promise<CurrentUserContext | null> => {
  const client = await getSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error) {
    throw new RepositoryError("Failed to resolve the authenticated user.", error);
  }

  if (!user) {
    return null;
  }

  const existingProfile = await profileRepository.getProfileByUserId(client, user.id);
  const profile = (await syncProfileFromAuthUser(user, existingProfile)) ?? existingProfile;
  const organizationId = profile?.organization_id ?? null;

  const [organization, rawRoleAssignments, facilityAssignments, departmentAssignments] = await Promise.all([
    organizationId ? organizationRepository.getOrganizationById(client, organizationId) : Promise.resolve(null),
    roleRepository.listUserRoleAssignments(client, user.id, organizationId),
    profileRepository.listFacilityAssignments(client, user.id),
    profileRepository.listDepartmentAssignments(client, user.id),
  ]);

  const roleAssignments = rawRoleAssignments.filter((assignment) => isActiveRoleAssignment(assignment.starts_at, assignment.ends_at));
  const roles = await roleRepository.listRolesByIds(
    client,
    roleAssignments.map((assignment) => assignment.role_id)
  );
  const permissions = await roleRepository.listPermissionsByRoleIds(
    client,
    roles.map((role) => role.id)
  );
  const permissionCodes = [...new Set([...permissions.map((permission) => permission.code), ...getFallbackPermissionCodes(roles)])];
  const isBootstrapAdmin = !organizationId && roleAssignments.length === 0;
  const canManageAdministration = permissionCodes.includes("admin.manage");

  return {
    authUser: user,
    profile,
    organization,
    roleAssignments,
    roles,
    permissions,
    permissionCodes,
    facilityAssignments,
    departmentAssignments,
    isBootstrapAdmin,
    canManageAdministration,
  };
});

export async function requireCurrentUserContext() {
  const context = await getCurrentUserContext();

  if (!context) {
    throw new UnauthorizedError();
  }

  return context;
}
