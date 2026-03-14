import { created, ok } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { validateInput, validateSearchParams } from "@/lib/validation";
import { createMetric, listMetricCatalog } from "@/features/kpis/metric.service";
import { metricSchema, metricsQuerySchema } from "@/features/kpis/metric.schemas";

export const GET = withRouteHandler(async (request: Request) => {
  const query = validateSearchParams(metricsQuerySchema, new URL(request.url));
  const catalog = await listMetricCatalog(query.limit);

  return ok(catalog);
});

export const POST = withRouteHandler(async (request: Request) => {
  const input = validateInput(metricSchema, await request.json());
  const metric = await createMetric(input);

  return created({
    metric,
  });
});
