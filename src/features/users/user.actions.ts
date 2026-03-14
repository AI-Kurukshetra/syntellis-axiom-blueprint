"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  assignDepartmentToOrganizationUser,
  assignFacilityToOrganizationUser,
  assignRoleToOrganizationUser,
  inviteUserToOrganization,
  reviewOrganizationUserProfile,
  revokeDepartmentAssignment,
  revokeFacilityAssignment,
  revokeRoleAssignment,
} from "@/features/users/user.service";
import {
  userDepartmentAssignmentRemovalSchema,
  userDepartmentAssignmentSchema,
  userFacilityAssignmentRemovalSchema,
  userFacilityAssignmentSchema,
  userInviteSchema,
  userProfileReviewSchema,
  userRoleAssignmentRemovalSchema,
  userRoleAssignmentSchema,
} from "@/features/users/user.schemas";
import { executeValidatedServerAction } from "@/lib/server-action";

function redirectAdminError(message: string): never {
  redirect(`/admin?error=${encodeURIComponent(message)}`);
}

function redirectAdminSuccess(message: string): never {
  revalidatePath("/admin");
  redirect(`/admin?message=${encodeURIComponent(message)}`);
}

export async function inviteUserAction(formData: FormData) {
  const result = await executeValidatedServerAction(userInviteSchema, Object.fromEntries(formData.entries()), (input) =>
    inviteUserToOrganization(input)
  );

  if (!result.success) {
    redirectAdminError(result.error.message);
  }

  redirectAdminSuccess(`Invitation sent to ${result.data.email}.`);
}

export async function reviewUserProfileAction(formData: FormData) {
  const result = await executeValidatedServerAction(userProfileReviewSchema, Object.fromEntries(formData.entries()), (input) =>
    reviewOrganizationUserProfile(input)
  );

  if (!result.success) {
    redirectAdminError(result.error.message);
  }

  redirectAdminSuccess(`Profile updated for ${result.data.full_name ?? result.data.work_email ?? "the selected user"}.`);
}

export async function assignUserRoleAction(formData: FormData) {
  const result = await executeValidatedServerAction(userRoleAssignmentSchema, Object.fromEntries(formData.entries()), (input) =>
    assignRoleToOrganizationUser(input)
  );

  if (!result.success) {
    redirectAdminError(result.error.message);
  }

  redirectAdminSuccess("Role assignment added.");
}

export async function revokeUserRoleAction(formData: FormData) {
  const result = await executeValidatedServerAction(userRoleAssignmentRemovalSchema, Object.fromEntries(formData.entries()), (input) =>
    revokeRoleAssignment(input.assignmentId)
  );

  if (!result.success) {
    redirectAdminError(result.error.message);
  }

  redirectAdminSuccess("Role assignment removed.");
}

export async function assignUserFacilityAction(formData: FormData) {
  const result = await executeValidatedServerAction(userFacilityAssignmentSchema, Object.fromEntries(formData.entries()), (input) =>
    assignFacilityToOrganizationUser(input)
  );

  if (!result.success) {
    redirectAdminError(result.error.message);
  }

  redirectAdminSuccess("Facility access assigned.");
}

export async function revokeUserFacilityAction(formData: FormData) {
  const result = await executeValidatedServerAction(userFacilityAssignmentRemovalSchema, Object.fromEntries(formData.entries()), (input) =>
    revokeFacilityAssignment(input.assignmentId)
  );

  if (!result.success) {
    redirectAdminError(result.error.message);
  }

  redirectAdminSuccess("Facility access removed.");
}

export async function assignUserDepartmentAction(formData: FormData) {
  const result = await executeValidatedServerAction(userDepartmentAssignmentSchema, Object.fromEntries(formData.entries()), (input) =>
    assignDepartmentToOrganizationUser(input)
  );

  if (!result.success) {
    redirectAdminError(result.error.message);
  }

  redirectAdminSuccess("Department access assigned.");
}

export async function revokeUserDepartmentAction(formData: FormData) {
  const result = await executeValidatedServerAction(userDepartmentAssignmentRemovalSchema, Object.fromEntries(formData.entries()), (input) =>
    revokeDepartmentAssignment(input.assignmentId)
  );

  if (!result.success) {
    redirectAdminError(result.error.message);
  }

  redirectAdminSuccess("Department access removed.");
}
