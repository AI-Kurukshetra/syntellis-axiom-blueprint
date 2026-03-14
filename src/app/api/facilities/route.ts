import { created, ok } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { validateInput, validateSearchParams } from "@/lib/validation";
import { createFacility, listFacilities } from "@/features/hierarchy/hierarchy.service";
import { facilitiesQuerySchema, facilitySchema } from "@/features/hierarchy/hierarchy.schemas";

export const GET = withRouteHandler(async (request: Request) => {
  const query = validateSearchParams(facilitiesQuerySchema, new URL(request.url));
  const response = await listFacilities(query.limit);

  return ok(response);
});

export const POST = withRouteHandler(async (request: Request) => {
  const input = validateInput(facilitySchema, await request.json());
  const facility = await createFacility(input);

  return created({
    facility,
  });
});
