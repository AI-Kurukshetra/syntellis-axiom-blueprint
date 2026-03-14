import { ok } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { validateInput } from "@/lib/validation";
import { deleteMetric, listMetricCatalog, updateMetric } from "@/features/kpis/metric.service";
import { metricUpdateSchema } from "@/features/kpis/metric.schemas";
import { NotFoundError } from "@/lib/http-errors";

export const GET = withRouteHandler(async (_request: Request, context: { params: Promise<{ metricId: string }> }) => {
  const { metricId } = await context.params;
  const catalog = await listMetricCatalog();
  const metric = catalog.metrics.find((entry) => entry.id === metricId);

  if (!metric) {
    throw new NotFoundError("The selected metric was not found.");
  }

  return ok({
    metric,
  });
});

export const PATCH = withRouteHandler(async (request: Request, context: { params: Promise<{ metricId: string }> }) => {
  const { metricId } = await context.params;
  const input = validateInput(metricUpdateSchema, {
    ...(await request.json()),
    metricId,
  });
  const metric = await updateMetric(metricId, input);

  return ok({
    metric,
  });
});

export const DELETE = withRouteHandler(async (_request: Request, context: { params: Promise<{ metricId: string }> }) => {
  const { metricId } = await context.params;
  const metric = await deleteMetric(metricId);

  return ok({
    metric,
    deleted: true,
  });
});
