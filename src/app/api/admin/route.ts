import { getAdminOverview } from "@/features/admin/admin.service";
import { adminOverviewQuerySchema } from "@/features/admin/admin.schemas";
import { notImplemented, ok } from "@/lib/api-response";
import { validateSearchParams } from "@/lib/validation";
import { withRouteHandler } from "@/lib/route-helpers";

export const GET = withRouteHandler(async (request: Request) => {
  const url = new URL(request.url);
  const { limit } = validateSearchParams(adminOverviewQuerySchema, url);
  const overview = await getAdminOverview({ previewLimit: limit });

  return ok(overview);
});

export const POST = withRouteHandler(async () => notImplemented("Admin create action is not implemented yet."));
