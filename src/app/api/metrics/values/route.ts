import { created, ok } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { validateInput, validateSearchParams } from "@/lib/validation";
import { metricValuePublishSchema, metricValueQuerySchema } from "@/features/kpis/metric-value.schemas";
import { listMetricValueCatalog, publishMetricValue } from "@/features/kpis/metric-value.service";

export const GET = withRouteHandler(async (request: Request) => {
  const query = validateSearchParams(metricValueQuerySchema, new URL(request.url));
  const catalog = await listMetricValueCatalog(query);
  return ok(catalog);
});

export const POST = withRouteHandler(async (request: Request) => {
  const input = validateInput(metricValuePublishSchema, await request.json());
  const metricValue = await publishMetricValue(input);
  return created({ metricValue });
});
