import { created, ok } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { validateInput, validateSearchParams } from "@/lib/validation";
import {
  createDashboard,
  listDashboardWorkspace,
} from "@/features/dashboards/dashboard.service";
import {
  dashboardCreateSchema,
  dashboardFiltersSchema,
} from "@/features/dashboards/dashboard.schemas";

export const GET = withRouteHandler(async (request: Request) => {
  const filters = validateSearchParams(dashboardFiltersSchema, new URL(request.url));
  const workspace = await listDashboardWorkspace(filters);
  return ok(workspace);
});

export const POST = withRouteHandler(async (request: Request) => {
  const input = validateInput(dashboardCreateSchema, await request.json());
  const dashboard = await createDashboard(input);
  return created(dashboard);
});

