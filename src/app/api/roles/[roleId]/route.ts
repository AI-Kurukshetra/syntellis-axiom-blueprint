import { ok } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { validateInput } from "@/lib/validation";
import { deleteOrganizationRole, listRoleCatalog, updateOrganizationRole } from "@/features/roles/role.service";
import { roleUpdateSchema } from "@/features/roles/role.schemas";

export const GET = withRouteHandler(async (_request: Request, context: { params: Promise<{ roleId: string }> }) => {
  const { roleId } = await context.params;
  const catalog = await listRoleCatalog();
  const entry = catalog.roles.find((item) => item.role.id === roleId);

  if (!entry) {
    throw new Error("The selected role was not found.");
  }

  return ok({
    role: entry.role,
    permissions: entry.permissions,
    canManage: entry.canManage,
  });
});

export const PATCH = withRouteHandler(async (request: Request, context: { params: Promise<{ roleId: string }> }) => {
  const { roleId } = await context.params;
  const input = validateInput(roleUpdateSchema, {
    ...(await request.json()),
    roleId,
  });
  const role = await updateOrganizationRole(roleId, input);

  return ok({
    role,
  });
});

export const DELETE = withRouteHandler(async (_request: Request, context: { params: Promise<{ roleId: string }> }) => {
  const { roleId } = await context.params;
  const role = await deleteOrganizationRole(roleId);

  return ok({
    role,
    deleted: true,
  });
});
