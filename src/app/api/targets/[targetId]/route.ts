import { ok } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { validateInput } from "@/lib/validation";
import { targetUpdateSchema } from "@/features/kpis/reference.schemas";
import { deleteTarget, listTargetCatalog, updateTarget } from "@/features/kpis/reference.service";
import { NotFoundError } from "@/lib/http-errors";

export const GET = withRouteHandler(async (_request: Request, context: { params: Promise<Record<string, string>> }) => {
  const { targetId } = await context.params as { targetId: string };
  const catalog = await listTargetCatalog();
  const target = catalog.targets.find((entry) => entry.id === targetId);

  if (!target) {
    throw new NotFoundError("The selected target was not found.");
  }

  return ok({ target });
});

export const PATCH = withRouteHandler(async (request: Request, context: { params: Promise<Record<string, string>> }) => {
  const { targetId } = await context.params as { targetId: string };
  const input = validateInput(targetUpdateSchema, { ...(await request.json()), targetId });
  const target = await updateTarget(targetId, input);
  return ok({ target });
});

export const DELETE = withRouteHandler(async (_request: Request, context: { params: Promise<Record<string, string>> }) => {
  const { targetId } = await context.params as { targetId: string };
  const target = await deleteTarget(targetId);
  return ok({ target, deleted: true });
});
