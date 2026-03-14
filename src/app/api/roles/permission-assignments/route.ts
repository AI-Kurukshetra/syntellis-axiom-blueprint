import { created, ok } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { validateInput } from "@/lib/validation";
import { assignPermissionToRole, removePermissionFromRole } from "@/features/roles/role.service";
import { rolePermissionAssignmentSchema, rolePermissionRemovalSchema } from "@/features/roles/role.schemas";

export const POST = withRouteHandler(async (request: Request) => {
  const input = validateInput(rolePermissionAssignmentSchema, await request.json());
  const rolePermission = await assignPermissionToRole(input);

  return created({
    rolePermission,
  });
});

export const DELETE = withRouteHandler(async (request: Request) => {
  const input = validateInput(rolePermissionRemovalSchema, await request.json());
  const rolePermission = await removePermissionFromRole(input);

  return ok({
    rolePermission,
    deleted: true,
  });
});
