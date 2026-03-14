import type { Permission, Role, RoleCatalog, RoleInput, RolePermission, RolePermissionAssignmentInput, RolePermissionDirectoryEntry } from "@/types";

import { safeLogAuditEvent } from "@/lib/audit";
import { requireAdminAccess } from "@/lib/auth/authorization";
import { ForbiddenError, NotFoundError } from "@/lib/http-errors";
import { roleRepository } from "@/lib/repositories/role.repository";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

function normalizeOptionalText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function buildRoleSlug(name: string, providedSlug?: string) {
  const source = providedSlug?.trim() || name;
  const slug = source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 63);

  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Enter a valid role slug using lowercase letters, numbers, and hyphens only.");
  }

  return slug;
}

async function requireRoleManagementContext() {
  const currentUser = await requireAdminAccess();
  const organizationId = currentUser.profile?.organization_id;

  if (!organizationId || !currentUser.organization) {
    throw new ForbiddenError("An organization context is required to manage roles.");
  }

  return {
    currentUser,
    organizationId,
    organization: currentUser.organization,
  };
}

async function requireManagedRole(roleId: string, organizationId: string) {
  const adminClient = getSupabaseAdminClient();
  const role = await roleRepository.getRoleById(adminClient, roleId);

  if (!role || role.organization_id !== organizationId) {
    throw new NotFoundError("The selected role does not exist in the current organization.");
  }

  if (role.is_system) {
    throw new ForbiddenError("System roles cannot be modified from the tenant admin workspace.");
  }

  return role;
}

async function requirePermission(permissionId: string) {
  const adminClient = getSupabaseAdminClient();
  const permission = await roleRepository.getPermissionById(adminClient, permissionId);

  if (!permission) {
    throw new NotFoundError("The selected permission was not found.");
  }

  return permission;
}

function mapRoleDirectory(
  roles: Role[],
  permissions: Permission[],
  rolePermissionRows: RolePermission[],
  organizationId: string
): RolePermissionDirectoryEntry[] {
  const permissionsById = new Map(permissions.map((permission) => [permission.id, permission] as const));
  const rolePermissionsByRoleId = new Map<string, Permission[]>();

  rolePermissionRows.forEach((rolePermission) => {
    const permission = permissionsById.get(rolePermission.permission_id);

    if (!permission) {
      return;
    }

    const entries = rolePermissionsByRoleId.get(rolePermission.role_id) ?? [];
    entries.push(permission);
    rolePermissionsByRoleId.set(rolePermission.role_id, entries);
  });

  return roles.map((role) => ({
    role,
    permissions: (rolePermissionsByRoleId.get(role.id) ?? []).sort((left, right) => left.code.localeCompare(right.code)),
    rolePermissions: rolePermissionRows.filter((row) => row.role_id === role.id),
    canManage: role.organization_id === organizationId && !role.is_system,
  }));
}

export async function listRoleCatalog(limit = 50): Promise<RoleCatalog> {
  const { organizationId, organization } = await requireRoleManagementContext();
  const client = await getSupabaseServerClient();
  const roles = await roleRepository.listRoles(client, organizationId);
  const visibleRoles = roles.slice(0, limit);
  const [permissions, rolePermissions] = await Promise.all([
    roleRepository.listPermissions(client),
    roleRepository.listRolePermissionsByRoleIds(client, visibleRoles.map((role) => role.id)),
  ]);

  return {
    organization,
    availablePermissions: permissions,
    roles: mapRoleDirectory(visibleRoles, permissions, rolePermissions, organizationId),
  };
}

export async function createOrganizationRole(input: RoleInput) {
  const { currentUser, organizationId } = await requireRoleManagementContext();
  const adminClient = getSupabaseAdminClient();
  const slug = buildRoleSlug(input.name, input.slug);
  const existingRole = await roleRepository.getRoleBySlug(adminClient, slug, organizationId);

  if (existingRole) {
    throw new Error("Role slug already exists in the current organization.");
  }

  const role = await roleRepository.createRole(adminClient, {
    organization_id: organizationId,
    name: input.name.trim(),
    slug,
    description: normalizeOptionalText(input.description),
    scope_level: input.scopeLevel,
    is_system: false,
  });

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "role.created",
    entityType: "role",
    entityId: role.id,
    scopeLevel: role.scope_level,
    metadata: {
      slug: role.slug,
      name: role.name,
    },
  });

  return role;
}

export async function updateOrganizationRole(roleId: string, input: RoleInput) {
  const { currentUser, organizationId } = await requireRoleManagementContext();
  const adminClient = getSupabaseAdminClient();
  const existingRole = await requireManagedRole(roleId, organizationId);
  const slug = buildRoleSlug(input.name, input.slug);

  if (slug !== existingRole.slug) {
    const conflictingRole = await roleRepository.getRoleBySlug(adminClient, slug, organizationId);

    if (conflictingRole && conflictingRole.id !== roleId) {
      throw new Error("Role slug already exists in the current organization.");
    }
  }

  const role = await roleRepository.updateRole(adminClient, roleId, {
    name: input.name.trim(),
    slug,
    description: normalizeOptionalText(input.description),
    scope_level: input.scopeLevel,
  });

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "role.updated",
    entityType: "role",
    entityId: role.id,
    scopeLevel: role.scope_level,
    metadata: {
      previous_scope_level: existingRole.scope_level,
      scope_level: role.scope_level,
      slug: role.slug,
    },
  });

  return role;
}

export async function deleteOrganizationRole(roleId: string) {
  const { currentUser, organizationId } = await requireRoleManagementContext();
  const adminClient = getSupabaseAdminClient();
  const role = await requireManagedRole(roleId, organizationId);
  const deletedRole = await roleRepository.deleteRole(adminClient, roleId);

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "role.deleted",
    entityType: "role",
    entityId: deletedRole.id,
    scopeLevel: deletedRole.scope_level,
    metadata: {
      slug: deletedRole.slug,
      name: deletedRole.name,
    },
  });

  return role;
}

export async function assignPermissionToRole(input: RolePermissionAssignmentInput) {
  const { currentUser, organizationId } = await requireRoleManagementContext();
  const adminClient = getSupabaseAdminClient();
  const role = await requireManagedRole(input.roleId, organizationId);
  const permission = await requirePermission(input.permissionId);
  const existingPermissions = await roleRepository.listRolePermissionsByRoleIds(adminClient, [role.id]);

  if (existingPermissions.some((entry) => entry.permission_id === permission.id)) {
    throw new Error("This permission is already assigned to the selected role.");
  }

  const rolePermission = await roleRepository.createRolePermission(adminClient, {
    role_id: role.id,
    permission_id: permission.id,
  });

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "role.permission_added",
    entityType: "role_permission",
    entityId: role.id,
    scopeLevel: role.scope_level,
    metadata: {
      permission_code: permission.code,
      permission_id: permission.id,
      role_id: role.id,
      role_slug: role.slug,
    },
  });

  return rolePermission;
}

export async function removePermissionFromRole(input: RolePermissionAssignmentInput) {
  const { currentUser, organizationId } = await requireRoleManagementContext();
  const adminClient = getSupabaseAdminClient();
  const role = await requireManagedRole(input.roleId, organizationId);
  const permission = await requirePermission(input.permissionId);
  const rolePermission = await roleRepository.deleteRolePermission(adminClient, role.id, permission.id);

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "role.permission_removed",
    entityType: "role_permission",
    entityId: role.id,
    scopeLevel: role.scope_level,
    metadata: {
      permission_code: permission.code,
      permission_id: permission.id,
      role_id: role.id,
      role_slug: role.slug,
    },
  });

  return rolePermission;
}
