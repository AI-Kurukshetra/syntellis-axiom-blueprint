import type { PostgrestResponse } from "@supabase/supabase-js";

import type { Permission, Role, RolePermission, TableInsert, TableUpdate, UserRoleAssignment } from "@/types";

import type { AppSupabaseClient } from "@/lib/repositories/base";
import { unwrapCount, unwrapMany, unwrapMaybeSingle, unwrapSingle } from "@/lib/repositories/base";

function applyRoleScopeFilter(query: ReturnType<AppSupabaseClient["from"]>, organizationId?: string | null) {
  if (!organizationId) {
    return query.is("organization_id", null);
  }

  return query.or(`organization_id.eq.${organizationId},organization_id.is.null`);
}

export const roleRepository = {
  async listRoles(client: AppSupabaseClient, organizationId?: string | null): Promise<Role[]> {
    const query = client.from("roles").select("*").order("is_system", { ascending: false }).order("name");

    return unwrapMany<Role>(
      await applyRoleScopeFilter(query, organizationId) as PostgrestResponse<Role>,
      "Failed to list roles."
    );
  },

  async listRolesByIds(client: AppSupabaseClient, roleIds: string[]): Promise<Role[]> {
    if (roleIds.length === 0) {
      return [];
    }

    return unwrapMany<Role>(
      await client.from("roles").select("*").in("id", [...new Set(roleIds)]).order("name") as PostgrestResponse<Role>,
      "Failed to load roles by id."
    );
  },

  async getRoleById(client: AppSupabaseClient, roleId: string): Promise<Role | null> {
    return unwrapMaybeSingle(
      await client.from("roles").select("*").eq("id", roleId).maybeSingle(),
      "Failed to load role by id."
    );
  },

  async getRoleBySlug(client: AppSupabaseClient, slug: string, organizationId?: string | null): Promise<Role | null> {
    const query = client.from("roles").select("*").eq("slug", slug);

    return unwrapMaybeSingle(
      await (organizationId ? query.eq("organization_id", organizationId) : query.is("organization_id", null)).maybeSingle(),
      "Failed to load role by slug."
    );
  },

  async createRole(client: AppSupabaseClient, role: TableInsert<"roles">): Promise<Role> {
    return unwrapSingle(
      await client.from("roles").insert(role).select("*").single(),
      "Failed to create role."
    );
  },

  async updateRole(client: AppSupabaseClient, roleId: string, role: TableUpdate<"roles">): Promise<Role> {
    return unwrapSingle(
      await client.from("roles").update(role).eq("id", roleId).select("*").single(),
      "Failed to update role."
    );
  },

  async deleteRole(client: AppSupabaseClient, roleId: string): Promise<Role> {
    return unwrapSingle(
      await client.from("roles").delete().eq("id", roleId).select("*").single(),
      "Failed to delete role."
    );
  },

  async countRoleAssignments(client: AppSupabaseClient, organizationId?: string | null) {
    const query = client.from("user_role_assignments").select("*", { count: "exact", head: true });

    return unwrapCount(
      await (organizationId ? query.eq("organization_id", organizationId) : query),
      "Failed to count role assignments."
    );
  },

  async listUserRoleAssignments(
    client: AppSupabaseClient,
    userId: string,
    organizationId?: string | null
  ): Promise<UserRoleAssignment[]> {
    const query = client.from("user_role_assignments").select("*").eq("user_id", userId);

    return unwrapMany<UserRoleAssignment>(
      await (organizationId ? query.eq("organization_id", organizationId) : query) as PostgrestResponse<UserRoleAssignment>,
      "Failed to load role assignments."
    );
  },

  async listRoleAssignmentsByOrganization(client: AppSupabaseClient, organizationId: string): Promise<UserRoleAssignment[]> {
    return unwrapMany<UserRoleAssignment>(
      await client.from("user_role_assignments").select("*").eq("organization_id", organizationId) as PostgrestResponse<UserRoleAssignment>,
      "Failed to load organization role assignments."
    );
  },

  async getUserRoleAssignmentById(client: AppSupabaseClient, assignmentId: string): Promise<UserRoleAssignment | null> {
    return unwrapMaybeSingle(
      await client.from("user_role_assignments").select("*").eq("id", assignmentId).maybeSingle(),
      "Failed to load role assignment."
    );
  },

  async listRolePermissionsByRoleIds(client: AppSupabaseClient, roleIds: string[]): Promise<RolePermission[]> {
    if (roleIds.length === 0) {
      return [];
    }

    return unwrapMany<RolePermission>(
      await client.from("role_permissions").select("*").in("role_id", [...new Set(roleIds)]) as PostgrestResponse<RolePermission>,
      "Failed to load role permissions."
    );
  },

  async listPermissionsByRoleIds(client: AppSupabaseClient, roleIds: string[]): Promise<Permission[]> {
    const rolePermissions = await this.listRolePermissionsByRoleIds(client, roleIds);
    const permissionIds = [...new Set(rolePermissions.map((rolePermission) => rolePermission.permission_id))];

    if (permissionIds.length === 0) {
      return [];
    }

    return unwrapMany<Permission>(
      await client.from("permissions").select("*").in("id", permissionIds).order("feature_area").order("code") as PostgrestResponse<Permission>,
      "Failed to load permissions."
    );
  },

  async listPermissions(client: AppSupabaseClient): Promise<Permission[]> {
    return unwrapMany<Permission>(
      await client.from("permissions").select("*").order("feature_area").order("code") as PostgrestResponse<Permission>,
      "Failed to list permissions."
    );
  },

  async getPermissionById(client: AppSupabaseClient, permissionId: string): Promise<Permission | null> {
    return unwrapMaybeSingle(
      await client.from("permissions").select("*").eq("id", permissionId).maybeSingle(),
      "Failed to load permission."
    );
  },

  async createRolePermission(client: AppSupabaseClient, rolePermission: TableInsert<"role_permissions">): Promise<RolePermission> {
    return unwrapSingle(
      await client.from("role_permissions").insert(rolePermission).select("*").single(),
      "Failed to create role permission."
    );
  },

  async deleteRolePermission(client: AppSupabaseClient, roleId: string, permissionId: string): Promise<RolePermission> {
    return unwrapSingle(
      await client.from("role_permissions").delete().eq("role_id", roleId).eq("permission_id", permissionId).select("*").single(),
      "Failed to delete role permission."
    );
  },

  async createUserRoleAssignment(
    client: AppSupabaseClient,
    assignment: TableInsert<"user_role_assignments">
  ): Promise<UserRoleAssignment> {
    return unwrapSingle(
      await client.from("user_role_assignments").insert(assignment).select("*").single(),
      "Failed to create user role assignment."
    );
  },

  async deleteUserRoleAssignment(client: AppSupabaseClient, assignmentId: string): Promise<UserRoleAssignment> {
    return unwrapSingle(
      await client.from("user_role_assignments").delete().eq("id", assignmentId).select("*").single(),
      "Failed to delete user role assignment."
    );
  },
};
