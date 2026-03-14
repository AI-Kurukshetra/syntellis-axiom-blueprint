import { ok } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { validateInput } from "@/lib/validation";
import { deleteKpiDefinition, listKpiCatalog, updateKpiDefinition } from "@/features/kpis/kpi.service";
import { kpiDefinitionUpdateSchema } from "@/features/kpis/kpi.schemas";
import { NotFoundError } from "@/lib/http-errors";

export const GET = withRouteHandler(async (_request: Request, context: { params: Promise<{ kpiId: string }> }) => {
  const { kpiId } = await context.params;
  const catalog = await listKpiCatalog();
  const definition = catalog.definitions.find((entry) => entry.id === kpiId);

  if (!definition) {
    throw new NotFoundError("The selected KPI definition was not found.");
  }

  return ok({
    definition,
  });
});

export const PATCH = withRouteHandler(async (request: Request, context: { params: Promise<{ kpiId: string }> }) => {
  const { kpiId } = await context.params;
  const input = validateInput(kpiDefinitionUpdateSchema, {
    ...(await request.json()),
    kpiId,
  });
  const definition = await updateKpiDefinition(kpiId, input);

  return ok({
    definition,
  });
});

export const DELETE = withRouteHandler(async (_request: Request, context: { params: Promise<{ kpiId: string }> }) => {
  const { kpiId } = await context.params;
  const definition = await deleteKpiDefinition(kpiId);

  return ok({
    definition,
    deleted: true,
  });
});
