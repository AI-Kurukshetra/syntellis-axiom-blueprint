import { ok } from "@/lib/api-response";
import { canAccessModule } from "@/lib/auth/authorization";
import { requireCurrentUserContext } from "@/lib/auth/current-user";
import { dashboardRepository } from "@/lib/repositories/dashboard.repository";
import { kpiRepository } from "@/lib/repositories/kpi.repository";
import { metricRepository } from "@/lib/repositories/metric.repository";
import { organizationRepository } from "@/lib/repositories/organization.repository";
import { reportRepository } from "@/lib/repositories/report.repository";
import { withRouteHandler } from "@/lib/route-helpers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { z, validateSearchParams } from "@/lib/validation";

const searchQuerySchema = z.object({
  q: z.string().trim().max(120).default(""),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

function matchesQuery(query: string, values: Array<string | null | undefined>) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return false;
  }

  return values.some((value) => value?.toLowerCase().includes(normalizedQuery));
}

export const GET = withRouteHandler(async (request: Request) => {
  const { q, limit } = validateSearchParams(searchQuerySchema, new URL(request.url));
  const currentUser = await requireCurrentUserContext();
  const organizationId = currentUser.profile?.organization_id;

  if (!organizationId) {
    return ok({ query: q, results: [] });
  }

  const client = await getSupabaseServerClient();
  const results: Array<{
    type: string;
    id: string;
    title: string;
    subtitle: string;
    href: string;
  }> = [];

  if (q.trim().length < 2) {
    return ok({ query: q, results });
  }

  if (canAccessModule(currentUser, "dashboard") || currentUser.canManageAdministration) {
    const dashboards = await dashboardRepository.listDashboards(client, organizationId);
    results.push(
      ...dashboards
        .filter((dashboard) => matchesQuery(q, [dashboard.name, dashboard.slug, dashboard.description]))
        .map((dashboard) => ({
          type: "dashboard",
          id: dashboard.id,
          title: dashboard.name,
          subtitle: dashboard.description ?? dashboard.slug,
          href: `/dashboard?dashboardSlug=${dashboard.slug}`,
        }))
    );
  }

  if (canAccessModule(currentUser, "reports") || currentUser.canManageAdministration) {
    const reports = await reportRepository.listReports(client, organizationId, 50);
    results.push(
      ...reports
        .filter((report) => matchesQuery(q, [report.name, report.slug, report.description]))
        .map((report) => ({
          type: "report",
          id: report.id,
          title: report.name,
          subtitle: report.description ?? report.slug,
          href: `/reports?reportSlug=${report.slug}`,
        }))
    );
  }

  if (canAccessModule(currentUser, "analytics") || currentUser.canManageAdministration) {
    const [kpis, metrics] = await Promise.all([
      kpiRepository.listKpiDefinitions(client, organizationId, 50),
      metricRepository.listMetrics(client, organizationId, 50),
    ]);

    results.push(
      ...kpis
        .filter((definition) => matchesQuery(q, [definition.name, definition.code, definition.domain, definition.formula_expression]))
        .map((definition) => ({
          type: "kpi",
          id: definition.id,
          title: definition.name,
          subtitle: `${definition.code} - ${definition.domain}`,
          href: "/analytics/catalog",
        }))
    );

    results.push(
      ...metrics
        .filter((metric) => matchesQuery(q, [metric.name, metric.code, metric.domain, metric.description]))
        .map((metric) => ({
          type: "metric",
          id: metric.id,
          title: metric.name,
          subtitle: `${metric.code} - ${metric.domain}`,
          href: "/analytics/catalog",
        }))
    );
  }

  const [facilities, departments, serviceLines] = await Promise.all([
    organizationRepository.listFacilities(client, organizationId, 50),
    organizationRepository.listDepartments(client, organizationId, 50),
    organizationRepository.listServiceLines(client, organizationId, 50),
  ]);

  results.push(
    ...facilities
      .filter((facility) => matchesQuery(q, [facility.name, facility.code, facility.city, facility.state_region]))
      .map((facility) => ({
        type: "facility",
        id: facility.id,
        title: facility.name,
        subtitle: `${facility.code} - ${facility.city ?? "n/a"}, ${facility.state_region ?? "n/a"}`,
        href: "/admin",
      }))
  );

  results.push(
    ...departments
      .filter((department) => matchesQuery(q, [department.name, department.code, department.description]))
      .map((department) => ({
        type: "department",
        id: department.id,
        title: department.name,
        subtitle: department.code,
        href: "/admin",
      }))
  );

  results.push(
    ...serviceLines
      .filter((serviceLine) => matchesQuery(q, [serviceLine.name, serviceLine.code, serviceLine.description]))
      .map((serviceLine) => ({
        type: "service-line",
        id: serviceLine.id,
        title: serviceLine.name,
        subtitle: serviceLine.code,
        href: "/admin",
      }))
  );

  return ok({
    query: q,
    results: results
      .slice(0, limit)
      .sort((left, right) => left.title.localeCompare(right.title, "en", { sensitivity: "base" })),
  });
});
