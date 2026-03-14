import { ok } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { deleteDashboardWidget } from "@/features/dashboards/dashboard.service";

export const DELETE = withRouteHandler(async (_request: Request, context: { params: Promise<{ widgetId: string }> }) => {
  const { widgetId } = await context.params;
  const result = await deleteDashboardWidget(widgetId);
  return ok(result);
});

