import { created, ok } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { validateInput } from "@/lib/validation";
import { organizationBootstrapSchema } from "@/features/organizations/organization.schemas";
import { bootstrapOrganizationForCurrentUser, listAccessibleOrganizations } from "@/features/organizations/organization.service";

export const GET = withRouteHandler(async () => {
  const organizations = await listAccessibleOrganizations();
  return ok(organizations);
});

export const POST = withRouteHandler(async (request: Request) => {
  const input = validateInput(organizationBootstrapSchema, await request.json());
  const organization = await bootstrapOrganizationForCurrentUser(input);

  return created({
    organization,
  });
});
