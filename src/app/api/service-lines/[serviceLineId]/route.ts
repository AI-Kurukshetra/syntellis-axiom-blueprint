import { notFound, ok } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { validateInput } from "@/lib/validation";
import { deleteServiceLine, getServiceLine, updateServiceLine } from "@/features/hierarchy/hierarchy.service";
import { serviceLineUpdateSchema } from "@/features/hierarchy/hierarchy.schemas";

type ServiceLineRouteContext = {
  params: Promise<{
    serviceLineId: string;
  }>;
};

export const GET = withRouteHandler(async (_request: Request, context: ServiceLineRouteContext) => {
  const { serviceLineId } = await context.params;
  const serviceLine = await getServiceLine(serviceLineId);

  return ok({
    serviceLine,
  });
});

export const PATCH = withRouteHandler(async (request: Request, context: ServiceLineRouteContext) => {
  const { serviceLineId } = await context.params;
  const input = validateInput(serviceLineUpdateSchema, await request.json());
  const serviceLine = await updateServiceLine(serviceLineId, input);

  return ok({
    serviceLine,
  });
});

export const DELETE = withRouteHandler(async (_request: Request, context: ServiceLineRouteContext) => {
  const { serviceLineId } = await context.params;

  if (!serviceLineId) {
    return notFound("Service line id is required.");
  }

  await deleteServiceLine(serviceLineId);

  return ok({
    deleted: true,
  });
});
