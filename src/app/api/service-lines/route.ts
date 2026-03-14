import { created, ok } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { validateInput, validateSearchParams } from "@/lib/validation";
import { createServiceLine, listServiceLines } from "@/features/hierarchy/hierarchy.service";
import { serviceLinesQuerySchema, serviceLineSchema } from "@/features/hierarchy/hierarchy.schemas";

export const GET = withRouteHandler(async (request: Request) => {
  const query = validateSearchParams(serviceLinesQuerySchema, new URL(request.url));
  const response = await listServiceLines(query.limit, query.facilityId);

  return ok(response);
});

export const POST = withRouteHandler(async (request: Request) => {
  const input = validateInput(serviceLineSchema, await request.json());
  const serviceLine = await createServiceLine(input);

  return created({
    serviceLine,
  });
});
