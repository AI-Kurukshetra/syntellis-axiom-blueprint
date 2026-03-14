import { notImplemented, ok } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { validateSearchParams } from "@/lib/validation";
import { analyticsQuerySchema } from "@/features/analytics/analytics.schemas";
import { listDomainAnalyticsWorkspace } from "@/features/analytics/analytics.service";

export const GET = withRouteHandler(async (request: Request) => {
  const filters = validateSearchParams(analyticsQuerySchema, new URL(request.url));
  const workspace = await listDomainAnalyticsWorkspace(filters);
  return ok(workspace);
});

export const POST = withRouteHandler(async () => notImplemented("Analytics mutations are handled in the KPI catalog workflow."));
