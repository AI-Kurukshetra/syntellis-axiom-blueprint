import { created, ok } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { validateInput } from "@/lib/validation";
import { organizationBootstrapSchema, organizationSettingsSchema } from "@/features/organizations/organization.schemas";
import {
  bootstrapOrganizationForCurrentUser,
  listAccessibleOrganizations,
  updateCurrentOrganizationSettings,
} from "@/features/organizations/organization.service";

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

export const PATCH = withRouteHandler(async (request: Request) => {
  const input = validateInput(organizationSettingsSchema, await request.json());
  const organization = await updateCurrentOrganizationSettings(input);

  return ok({
    organization,
  });
});
