import { created } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { createKpiDefinitionVersion } from "@/features/kpis/kpi.service";

export const POST = withRouteHandler(async (_request: Request, context: { params: Promise<Record<string, string>> }) => {
  const { kpiId } = await context.params as { kpiId: string };
  const result = await createKpiDefinitionVersion(kpiId);

  return created(result);
});
