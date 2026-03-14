import { z } from "@/lib/validation";

const optionalText = z.string().trim().max(160).optional().or(z.literal(""));
const optionalSlug = z.string().trim().max(63).optional().or(z.literal(""));
const roleScopeSchema = z.enum(["organization", "facility", "department", "service_line"], {
  message: "Select a valid role scope.",
});

export const rolesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export const roleSchema = z.object({
  name: z.string().trim().min(2, "Role name is required.").max(120, "Role name is too long."),
  slug: optionalSlug,
  description: optionalText,
  scopeLevel: roleScopeSchema,
});

export const roleUpdateSchema = roleSchema.extend({
  roleId: z.string().uuid("A valid role id is required."),
});

export const roleRemovalSchema = z.object({
  roleId: z.string().uuid("A valid role id is required."),
});

export const rolePermissionAssignmentSchema = z.object({
  roleId: z.string().uuid("A valid role id is required."),
  permissionId: z.string().uuid("A valid permission id is required."),
});

export const rolePermissionRemovalSchema = z.object({
  roleId: z.string().uuid("A valid role id is required."),
  permissionId: z.string().uuid("A valid permission id is required."),
});
