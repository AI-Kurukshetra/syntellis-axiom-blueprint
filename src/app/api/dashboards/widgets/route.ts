import { created } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { validateInput } from "@/lib/validation";
import { createDashboardWidget } from "@/features/dashboards/dashboard.service";
import { dashboardWidgetSchema } from "@/features/dashboards/dashboard.schemas";

export const POST = withRouteHandler(async (request: Request) => {
  const input = validateInput(dashboardWidgetSchema, await request.json());
  const result = await createDashboardWidget(input);
  return created(result);
});

