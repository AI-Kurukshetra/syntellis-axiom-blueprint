import { created, ok } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { validateInput } from "@/lib/validation";
import { targetSchema } from "@/features/kpis/reference.schemas";
import { createTarget, listTargetCatalog } from "@/features/kpis/reference.service";

export const GET = withRouteHandler(async () => {
  const catalog = await listTargetCatalog();
  return ok(catalog);
});

export const POST = withRouteHandler(async (request: Request) => {
  const input = validateInput(targetSchema, await request.json());
  const target = await createTarget(input);
  return created({ target });
});
