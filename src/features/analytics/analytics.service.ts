import type {
  AnalyticsDomainKey,
  DomainAnalyticsComparisonRow,
  DomainAnalyticsFiltersInput,
  DomainAnalyticsSummaryCard,
  DomainAnalyticsWorkspace,
  Metric,
  MetricValue,
  PublishedMetricValueRecord,
} from "@/types";

import { canAccessModule, requireModuleAccess } from "@/lib/auth/authorization";
import { requireCurrentUserContext } from "@/lib/auth/current-user";
import { ForbiddenError } from "@/lib/http-errors";
import { RepositoryError } from "@/lib/repositories/base";
import { benchmarkRepository } from "@/lib/repositories/benchmark.repository";
import { kpiRepository } from "@/lib/repositories/kpi.repository";
import { metricRepository } from "@/lib/repositories/metric.repository";
import { metricValueRepository } from "@/lib/repositories/metric-value.repository";
import { organizationRepository } from "@/lib/repositories/organization.repository";
import { targetRepository } from "@/lib/repositories/target.repository";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import {
  computeMetricFreshnessStatus,
  computeVariance,
  filterMetricValuesForScope,
  selectApplicableBenchmark,
  selectApplicableTarget,
} from "@/features/kpis/analytics.helpers";

const domainLabels: Record<AnalyticsDomainKey, string> = {
  financial: "Financial",
  operations: "Operational",
  clinical_quality: "Clinical Quality",
  revenue_cycle: "Revenue Cycle",
};

const analyticsSavedViews: DomainAnalyticsWorkspace["savedViews"] = [
  {
    key: "executive-monthly",
    label: "Executive monthly",
    description: "Organization-wide monthly performance across the default lookback window.",
    filters: {
      domainTab: "financial",
      compareBy: "organization",
    },
  },
  {
    key: "facility-ops",
    label: "Facility operations",
    description: "Facility-level operational comparison for throughput and utilization signals.",
    filters: {
      domainTab: "operations",
      compareBy: "facility",
    },
  },
  {
    key: "quality-watch",
    label: "Quality watch",
    description: "Clinical quality indicators with department-level comparison.",
    filters: {
      domainTab: "clinical_quality",
      compareBy: "department",
    },
  },
  {
    key: "revenue-cycle",
    label: "Revenue cycle",
    description: "Revenue performance and cycle-specific signals when metric publication is available.",
    filters: {
      domainTab: "revenue_cycle",
      compareBy: "facility",
    },
  },
];

function getDomainKeysForMetric(metric: Metric) {
  const domain = metric.domain.toLowerCase();

  if (domain.includes("financial")) {
    return ["financial"] as AnalyticsDomainKey[];
  }

  if (domain.includes("operational")) {
    return ["operations"] as AnalyticsDomainKey[];
  }

  if (domain.includes("clinical")) {
    return ["clinical_quality"] as AnalyticsDomainKey[];
  }

  if (domain.includes("revenue")) {
    return ["revenue_cycle"] as AnalyticsDomainKey[];
  }

  return [] as AnalyticsDomainKey[];
}

function getDefaultDateFrom() {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - 5);
  return date.toISOString().slice(0, 10);
}

function getDefaultDateTo() {
  return new Date().toISOString().slice(0, 10);
}

function getResolvedFilters(filters: DomainAnalyticsFiltersInput = {}): Required<DomainAnalyticsFiltersInput> {
  const savedView = analyticsSavedViews.find((view) => view.key === filters.savedView);

  return {
    domainTab: filters.domainTab ?? (savedView?.filters.domainTab as AnalyticsDomainKey | undefined) ?? "financial",
    facilityId: filters.facilityId?.trim() || "",
    departmentId: filters.departmentId?.trim() || "",
    serviceLineId: filters.serviceLineId?.trim() || "",
    dateFrom: filters.dateFrom?.trim() || (savedView?.filters.dateFrom as string | undefined) || getDefaultDateFrom(),
    dateTo: filters.dateTo?.trim() || (savedView?.filters.dateTo as string | undefined) || getDefaultDateTo(),
    compareBy: filters.compareBy ?? (savedView?.filters.compareBy as Required<DomainAnalyticsFiltersInput>["compareBy"] | undefined) ?? "facility",
    savedView: filters.savedView?.trim() || "",
  };
}

function buildPublishedMetricValueRecord(
  metricValue: MetricValue,
  metrics: Metric[],
  kpis: Awaited<ReturnType<typeof kpiRepository.listKpiDefinitions>>,
  benchmarks: Awaited<ReturnType<typeof benchmarkRepository.listBenchmarks>>,
  targets: Awaited<ReturnType<typeof targetRepository.listTargets>>
): PublishedMetricValueRecord {
  const metric = metrics.find((entry) => entry.id === metricValue.metric_id) ?? null;
  const kpiDefinition = kpis.find((entry) => entry.id === metricValue.kpi_definition_id) ?? null;
  const target = selectApplicableTarget(targets, metricValue);
  const benchmark = selectApplicableBenchmark(benchmarks, metricValue);
  const targetValue = metricValue.target_value ?? target?.target_value ?? null;
  const benchmarkValue = metricValue.benchmark_value ?? benchmark?.value_numeric ?? null;

  return {
    metricValue: {
      ...metricValue,
      target_value: targetValue,
      benchmark_value: benchmarkValue,
      variance_value: metricValue.variance_value ?? computeVariance(metricValue.value_numeric, targetValue, benchmarkValue),
    },
    metric,
    kpiDefinition,
    target,
    benchmark,
    freshness: computeMetricFreshnessStatus(metricValue.as_of_date, kpiDefinition?.aggregation_grain ?? null),
  };
}

function sortMetricValues(values: PublishedMetricValueRecord[]) {
  return [...values].sort((left, right) => new Date(right.metricValue.as_of_date).getTime() - new Date(left.metricValue.as_of_date).getTime());
}

function buildSummaryCards(values: PublishedMetricValueRecord[]): DomainAnalyticsSummaryCard[] {
  const byMetric = new Map<string, PublishedMetricValueRecord[]>();

  for (const value of values) {
    const list = byMetric.get(value.metricValue.metric_id) ?? [];
    list.push(value);
    byMetric.set(value.metricValue.metric_id, list);
  }

  return [...byMetric.values()]
    .map((entries) => sortMetricValues(entries))
    .slice(0, 4)
    .map((entries) => ({
      metric: entries[0].metric!,
      latestValue: entries[0] ?? null,
      trend: entries.slice(0, 6).reverse(),
    }));
}

function buildScopeLabel(
  entry: PublishedMetricValueRecord,
  compareBy: Required<DomainAnalyticsFiltersInput>["compareBy"],
  facilities: Awaited<ReturnType<typeof organizationRepository.listFacilities>>,
  departments: Awaited<ReturnType<typeof organizationRepository.listDepartments>>,
  serviceLines: Awaited<ReturnType<typeof organizationRepository.listServiceLines>>
) {
  const facility = facilities.find((item) => item.id === entry.metricValue.facility_id);
  const department = departments.find((item) => item.id === entry.metricValue.department_id);
  const serviceLine = serviceLines.find((item) => item.id === entry.metricValue.service_line_id);

  switch (compareBy) {
    case "department":
      return department?.name ?? facility?.name ?? "Organization";
    case "service_line":
      return serviceLine?.name ?? department?.name ?? facility?.name ?? "Organization";
    case "organization":
      return "Organization";
    case "facility":
    default:
      return facility?.name ?? department?.name ?? "Organization";
  }
}

function buildComparisonRows(
  values: PublishedMetricValueRecord[],
  compareBy: Required<DomainAnalyticsFiltersInput>["compareBy"],
  facilities: Awaited<ReturnType<typeof organizationRepository.listFacilities>>,
  departments: Awaited<ReturnType<typeof organizationRepository.listDepartments>>,
  serviceLines: Awaited<ReturnType<typeof organizationRepository.listServiceLines>>
): DomainAnalyticsComparisonRow[] {
  const latestByScope = new Map<string, PublishedMetricValueRecord>();

  for (const value of sortMetricValues(values)) {
    const scopeLabel = buildScopeLabel(value, compareBy, facilities, departments, serviceLines);
    const scopeKey = `${value.metricValue.metric_id}:${scopeLabel}`;

    if (!latestByScope.has(scopeKey)) {
      latestByScope.set(scopeKey, value);
    }
  }

  return [...latestByScope.entries()]
    .map(([scopeKey, latestValue]) => ({
      scopeKey,
      scopeLabel: `${latestValue.metric?.name ?? latestValue.metricValue.metric_id} - ${buildScopeLabel(latestValue, compareBy, facilities, departments, serviceLines)}`,
      latestValue,
      variance: latestValue.metricValue.variance_value ?? null,
    }))
    .slice(0, 12);
}

async function countRows(client: Awaited<ReturnType<typeof getSupabaseServerClient>>, table: "financial_transactions" | "budget_items" | "clinical_encounters", organizationId: string) {
  const { count, error } = await client.from(table).select("*", { count: "exact", head: true }).eq("organization_id", organizationId);

  if (error) {
    throw new RepositoryError(`Failed to count ${table}.`, error);
  }

  return count ?? 0;
}

export async function listDomainAnalyticsWorkspace(filters: DomainAnalyticsFiltersInput = {}): Promise<DomainAnalyticsWorkspace> {
  const currentUser = await requireCurrentUserContext();
  const organizationId = currentUser.profile?.organization_id;

  if (!organizationId || !currentUser.organization) {
    throw new ForbiddenError("An organization context is required to review analytics.");
  }

  if (!canAccessModule(currentUser, "analytics") && !currentUser.canManageAdministration) {
    throw new ForbiddenError("Analytics access is required to view domain analytics.");
  }

  const client = await getSupabaseServerClient();
  const resolvedFilters = getResolvedFilters(filters);
  const [metrics, values, kpis, benchmarks, targets, facilities, departments, serviceLines, financialTransactions, budgetItems, clinicalEncounters] = await Promise.all([
    metricRepository.listMetrics(client, organizationId, 100),
    metricValueRepository.listMetricValues(client, organizationId, 250),
    kpiRepository.listKpiDefinitions(client, organizationId, 100),
    benchmarkRepository.listBenchmarks(client, organizationId, 100),
    targetRepository.listTargets(client, organizationId, 100),
    organizationRepository.listFacilities(client, organizationId, 100),
    organizationRepository.listDepartments(client, organizationId, 100),
    organizationRepository.listServiceLines(client, organizationId, 100),
    countRows(client, "financial_transactions", organizationId),
    countRows(client, "budget_items", organizationId),
    countRows(client, "clinical_encounters", organizationId),
  ]);

  const filteredValues = filterMetricValuesForScope(values, {
    facilityId: resolvedFilters.facilityId || null,
    departmentId: resolvedFilters.departmentId || null,
    serviceLineId: resolvedFilters.serviceLineId || null,
    status: "all",
    dateFrom: resolvedFilters.dateFrom,
    dateTo: resolvedFilters.dateTo,
  }).map((metricValue) => buildPublishedMetricValueRecord(metricValue, metrics, kpis, benchmarks, targets));

  const domainValues = sortMetricValues(
    filteredValues.filter((entry) => {
      if (!entry.metric) {
        return false;
      }

      return getDomainKeysForMetric(entry.metric).includes(resolvedFilters.domainTab);
    })
  );

  return {
    organization: currentUser.organization,
    activeDomain: resolvedFilters.domainTab,
    filters: resolvedFilters,
    facilities,
    departments,
    serviceLines,
    summaryCards: buildSummaryCards(domainValues),
    comparisonRows: buildComparisonRows(domainValues, resolvedFilters.compareBy, facilities, departments, serviceLines),
    detailRows: domainValues.slice(0, 24),
    rawCounts: {
      financialTransactions,
      budgetItems,
      clinicalEncounters,
    },
    savedViews: analyticsSavedViews,
  };
}

export async function requireAnalyticsCatalogAccess() {
  return requireModuleAccess("analytics");
}

export function getAnalyticsDomainLabel(domainKey: AnalyticsDomainKey) {
  return domainLabels[domainKey];
}
