import { created, ok } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { validateInput, validateSearchParams } from "@/lib/validation";
import { createKpiDefinition, listKpiCatalog } from "@/features/kpis/kpi.service";
import { kpiDefinitionSchema, kpisQuerySchema } from "@/features/kpis/kpi.schemas";

export const GET = withRouteHandler(async (request: Request) => {
  const query = validateSearchParams(kpisQuerySchema, new URL(request.url));
  const catalog = await listKpiCatalog(query.limit);

  return ok(catalog);
});

export const POST = withRouteHandler(async (request: Request) => {
  const input = validateInput(kpiDefinitionSchema, await request.json());
  const definition = await createKpiDefinition(input);

  return created({
    definition,
  });
});
