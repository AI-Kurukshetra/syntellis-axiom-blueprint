"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  assignPermissionToRole,
  createOrganizationRole,
  deleteOrganizationRole,
  removePermissionFromRole,
  updateOrganizationRole,
} from "@/features/roles/role.service";
import {
  rolePermissionAssignmentSchema,
  roleRemovalSchema,
  roleSchema,
  roleUpdateSchema,
} from "@/features/roles/role.schemas";
import { executeValidatedServerAction } from "@/lib/server-action";

function redirectRoleError(message: string): never {
  redirect(`/admin?error=${encodeURIComponent(message)}`);
}

function redirectRoleSuccess(message: string): never {
  revalidatePath("/admin");
  redirect(`/admin?message=${encodeURIComponent(message)}`);
}

export async function createRoleAction(formData: FormData) {
  const result = await executeValidatedServerAction(roleSchema, Object.fromEntries(formData.entries()), (input) =>
    createOrganizationRole(input)
  );

  if (!result.success) {
    redirectRoleError(result.error.message);
  }

  redirectRoleSuccess(`Role ${result.data.name} created.`);
}

export async function updateRoleAction(formData: FormData) {
  const result = await executeValidatedServerAction(roleUpdateSchema, Object.fromEntries(formData.entries()), (input) =>
    updateOrganizationRole(input.roleId, input)
  );

  if (!result.success) {
    redirectRoleError(result.error.message);
  }

  redirectRoleSuccess(`Role ${result.data.name} updated.`);
}

export async function deleteRoleAction(formData: FormData) {
  const result = await executeValidatedServerAction(roleRemovalSchema, Object.fromEntries(formData.entries()), async (input) => {
    const role = await deleteOrganizationRole(input.roleId);
    return { roleId: role.id, roleName: role.name };
  });

  if (!result.success) {
    redirectRoleError(result.error.message);
  }

  redirectRoleSuccess(`Role ${result.data.roleName} removed.`);
}

export async function assignRolePermissionAction(formData: FormData) {
  const result = await executeValidatedServerAction(
    rolePermissionAssignmentSchema,
    Object.fromEntries(formData.entries()),
    (input) => assignPermissionToRole(input)
  );

  if (!result.success) {
    redirectRoleError(result.error.message);
  }

  redirectRoleSuccess("Permission assigned to role.");
}

export async function removeRolePermissionAction(formData: FormData) {
  const result = await executeValidatedServerAction(
    rolePermissionAssignmentSchema,
    Object.fromEntries(formData.entries()),
    (input) => removePermissionFromRole(input)
  );

  if (!result.success) {
    redirectRoleError(result.error.message);
  }

  redirectRoleSuccess("Permission removed from role.");
}
