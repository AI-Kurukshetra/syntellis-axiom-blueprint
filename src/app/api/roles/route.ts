import { created, ok } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { validateInput, validateSearchParams } from "@/lib/validation";
import { createOrganizationRole, listRoleCatalog } from "@/features/roles/role.service";
import { roleSchema, rolesQuerySchema } from "@/features/roles/role.schemas";

export const GET = withRouteHandler(async (request: Request) => {
  const query = validateSearchParams(rolesQuerySchema, new URL(request.url));
  const catalog = await listRoleCatalog(query.limit);

  return ok(catalog);
});

export const POST = withRouteHandler(async (request: Request) => {
  const input = validateInput(roleSchema, await request.json());
  const role = await createOrganizationRole(input);

  return created({
    role,
  });
});
