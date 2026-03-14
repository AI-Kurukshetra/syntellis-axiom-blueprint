import { created, ok } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { validateInput } from "@/lib/validation";
import { benchmarkSchema } from "@/features/kpis/reference.schemas";
import { createBenchmark, listBenchmarkCatalog } from "@/features/kpis/reference.service";

export const GET = withRouteHandler(async () => {
  const catalog = await listBenchmarkCatalog();
  return ok(catalog);
});

export const POST = withRouteHandler(async (request: Request) => {
  const input = validateInput(benchmarkSchema, await request.json());
  const benchmark = await createBenchmark(input);
  return created({ benchmark });
});
