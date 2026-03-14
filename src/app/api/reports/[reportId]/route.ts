import { notFound, ok } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { validateInput } from "@/lib/validation";
import { deleteReport, listReportWorkspace, updateReport } from "@/features/reports/report.service";
import { reportUpdateSchema } from "@/features/reports/report.schemas";

type ReportRouteContext = {
  params: Promise<{ reportId: string }>;
};

export const GET = withRouteHandler(async (_request: Request, context: ReportRouteContext) => {
  const { reportId } = await context.params;
  const workspace = await listReportWorkspace();
  const report = workspace.reports.find((entry) => entry.id === reportId) ?? null;

  if (!report) {
    return notFound("Report id is required.");
  }

  const detail = await listReportWorkspace({ reportSlug: report.slug });
  return ok(detail);
});

export const PATCH = withRouteHandler(async (request: Request, context: ReportRouteContext) => {
  const { reportId } = await context.params;
  const input = validateInput(reportUpdateSchema, { ...(await request.json()), reportId });
  const report = await updateReport(reportId, input);
  return ok(report);
});

export const DELETE = withRouteHandler(async (_request: Request, context: ReportRouteContext) => {
  const { reportId } = await context.params;
  const report = await deleteReport(reportId);
  return ok(report);
});
