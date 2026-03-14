import { created, ok } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { validateInput, validateSearchParams } from "@/lib/validation";
import { createReport, listReportWorkspace } from "@/features/reports/report.service";
import { reportQuerySchema, reportSchema } from "@/features/reports/report.schemas";

export const GET = withRouteHandler(async (request: Request) => {
  const filters = validateSearchParams(reportQuerySchema, new URL(request.url));
  const workspace = await listReportWorkspace(filters);
  return ok(workspace);
});

export const POST = withRouteHandler(async (request: Request) => {
  const input = validateInput(reportSchema, await request.json());
  const report = await createReport(input);
  return created(report);
});
