import { ok } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { validateInput } from "@/lib/validation";
import { benchmarkUpdateSchema } from "@/features/kpis/reference.schemas";
import { deleteBenchmark, listBenchmarkCatalog, updateBenchmark } from "@/features/kpis/reference.service";
import { NotFoundError } from "@/lib/http-errors";

export const GET = withRouteHandler(async (_request: Request, context: { params: Promise<Record<string, string>> }) => {
  const { benchmarkId } = await context.params as { benchmarkId: string };
  const catalog = await listBenchmarkCatalog();
  const benchmark = catalog.benchmarks.find((entry) => entry.id === benchmarkId);

  if (!benchmark) {
    throw new NotFoundError("The selected benchmark was not found.");
  }

  return ok({ benchmark });
});

export const PATCH = withRouteHandler(async (request: Request, context: { params: Promise<Record<string, string>> }) => {
  const { benchmarkId } = await context.params as { benchmarkId: string };
  const input = validateInput(benchmarkUpdateSchema, { ...(await request.json()), benchmarkId });
  const benchmark = await updateBenchmark(benchmarkId, input);
  return ok({ benchmark });
});

export const DELETE = withRouteHandler(async (_request: Request, context: { params: Promise<Record<string, string>> }) => {
  const { benchmarkId } = await context.params as { benchmarkId: string };
  const benchmark = await deleteBenchmark(benchmarkId);
  return ok({ benchmark, deleted: true });
});
