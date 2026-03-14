import { created } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { validateInput } from "@/lib/validation";
import { runReport } from "@/features/reports/report.service";
import { reportRunSchema } from "@/features/reports/report.schemas";

export const POST = withRouteHandler(async (request: Request) => {
  const input = validateInput(reportRunSchema, await request.json());
  const run = await runReport(input);
  return created(run);
});
