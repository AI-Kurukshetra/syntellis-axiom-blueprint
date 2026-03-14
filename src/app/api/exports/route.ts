import { badRequest } from "@/lib/api-response";
import { safeLogAuditEvent } from "@/lib/audit";
import { requireCurrentUserContext } from "@/lib/auth/current-user";
import { toCsv } from "@/lib/csv";
import { withRouteHandler } from "@/lib/route-helpers";
import { validateSearchParams } from "@/lib/validation";
import { analyticsQuerySchema } from "@/features/analytics/analytics.schemas";
import { listDomainAnalyticsWorkspace } from "@/features/analytics/analytics.service";

export const GET = withRouteHandler(async (request: Request) => {
  const url = new URL(request.url);
  const source = url.searchParams.get("source");

  if (source !== "analytics") {
    return badRequest("Only analytics exports are supported from this endpoint.");
  }

  const filters = validateSearchParams(analyticsQuerySchema, url);
  const workspace = await listDomainAnalyticsWorkspace(filters);
  const currentUser = await requireCurrentUserContext();
  const csv = toCsv(
    ["Metric", "Code", "Domain", "As Of", "Status", "Value", "Target", "Benchmark", "Variance", "Freshness"],
    workspace.detailRows.map((row) => [
      row.metric?.name ?? row.metricValue.metric_id,
      row.metric?.code ?? row.metricValue.metric_id,
      row.metric?.domain ?? workspace.activeDomain,
      row.metricValue.as_of_date,
      row.metricValue.status,
      row.metricValue.value_numeric ?? row.metricValue.value_text ?? "JSON",
      row.metricValue.target_value ?? "",
      row.metricValue.benchmark_value ?? "",
      row.metricValue.variance_value ?? "",
      row.freshness,
    ])
  );

  await safeLogAuditEvent({
    organizationId: workspace.organization?.id ?? currentUser.profile?.organization_id ?? null,
    actorUserId: currentUser.authUser.id,
    action: "analytics.exported",
    entityType: "analytics_view",
    scopeLevel: filters.departmentId ? "department" : filters.serviceLineId ? "service_line" : filters.facilityId ? "facility" : "organization",
    facilityId: filters.facilityId || null,
    departmentId: filters.departmentId || null,
    metadata: {
      domain_tab: workspace.activeDomain,
      date_from: filters.dateFrom ?? null,
      date_to: filters.dateTo ?? null,
      row_count: workspace.detailRows.length,
      source,
    },
  });

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"analytics-${workspace.activeDomain}.csv\"`,
    },
  });
});
