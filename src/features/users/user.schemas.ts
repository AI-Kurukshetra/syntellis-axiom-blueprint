import { z } from "@/lib/validation";

const optionalText = z.string().trim().max(160).optional().or(z.literal(""));
const optionalDateTime = z.string().trim().max(40).optional().or(z.literal(""));
const optionalUuid = z.string().uuid().optional().or(z.literal(""));

export const organizationUsersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const userInviteSchema = z.object({
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  fullName: z.string().trim().min(2, "Full name is required.").max(120, "Full name is too long."),
  title: z.string().trim().max(120, "Title is too long.").optional().or(z.literal("")),
  roleSlug: z.string().trim().min(1, "Select a role for the invited user."),
});

export const userProfileReviewSchema = z.object({
  userId: z.string().uuid("A valid user id is required."),
  fullName: optionalText,
  title: optionalText,
  status: z.enum(["pending", "active", "inactive", "suspended"], "Select a valid user status."),
});

export const userRoleAssignmentSchema = z.object({
  userId: z.string().uuid("A valid user id is required."),
  roleId: z.string().uuid("Select a valid role."),
  facilityId: optionalUuid,
  departmentId: optionalUuid,
  serviceLineId: optionalUuid,
  startsAt: optionalDateTime,
  endsAt: optionalDateTime,
});

export const userRoleAssignmentRemovalSchema = z.object({
  assignmentId: z.string().uuid("A valid role assignment id is required."),
});

export const userFacilityAssignmentSchema = z.object({
  userId: z.string().uuid("A valid user id is required."),
  facilityId: z.string().uuid("Select a valid facility."),
});

export const userFacilityAssignmentRemovalSchema = z.object({
  assignmentId: z.string().uuid("A valid facility assignment id is required."),
});

export const userDepartmentAssignmentSchema = z.object({
  userId: z.string().uuid("A valid user id is required."),
  departmentId: z.string().uuid("Select a valid department."),
});

export const userDepartmentAssignmentRemovalSchema = z.object({
  assignmentId: z.string().uuid("A valid department assignment id is required."),
});
