import { badRequest } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { exportReportCsv } from "@/features/reports/report.service";

export const GET = withRouteHandler(async (request: Request) => {
  const url = new URL(request.url);
  const reportId = url.searchParams.get("reportId");

  if (!reportId) {
    return badRequest("Report id is required.");
  }

  const { report, csv } = await exportReportCsv(reportId);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${report.slug}.csv"`,
    },
  });
});
