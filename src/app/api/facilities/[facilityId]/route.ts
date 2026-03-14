import { notFound, ok } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { validateInput } from "@/lib/validation";
import { deleteFacility, getFacility, updateFacility } from "@/features/hierarchy/hierarchy.service";
import { facilityUpdateSchema } from "@/features/hierarchy/hierarchy.schemas";

type FacilityRouteContext = {
  params: Promise<{
    facilityId: string;
  }>;
};

export const GET = withRouteHandler(async (_request: Request, context: FacilityRouteContext) => {
  const { facilityId } = await context.params;
  const facility = await getFacility(facilityId);

  return ok({
    facility,
  });
});

export const PATCH = withRouteHandler(async (request: Request, context: FacilityRouteContext) => {
  const { facilityId } = await context.params;
  const input = validateInput(facilityUpdateSchema, await request.json());
  const facility = await updateFacility(facilityId, input);

  return ok({
    facility,
  });
});

export const DELETE = withRouteHandler(async (_request: Request, context: FacilityRouteContext) => {
  const { facilityId } = await context.params;

  if (!facilityId) {
    return notFound("Facility id is required.");
  }

  await deleteFacility(facilityId);

  return ok({
    deleted: true,
  });
});
