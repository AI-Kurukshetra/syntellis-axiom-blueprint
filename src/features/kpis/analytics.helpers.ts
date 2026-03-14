import type { Benchmark, Metric, MetricValue, Target } from "@/types";

export type MetricFreshnessStatus = "fresh" | "warning" | "stale";

function getFreshnessWindowDays(aggregationGrain?: string | null) {
  switch ((aggregationGrain ?? "").toLowerCase()) {
    case "daily":
      return 2;
    case "weekly":
      return 8;
    case "monthly":
      return 32;
    case "quarterly":
      return 95;
    case "annual":
      return 370;
    default:
      return 30;
  }
}

export function computeMetricFreshnessStatus(asOfDate: string, aggregationGrain?: string | null, now = new Date()): MetricFreshnessStatus {
  const metricDate = new Date(asOfDate);
  const diffDays = (now.getTime() - metricDate.getTime()) / (1000 * 60 * 60 * 24);
  const windowDays = getFreshnessWindowDays(aggregationGrain);

  if (diffDays <= windowDays) {
    return "fresh";
  }

  if (diffDays <= windowDays * 2) {
    return "warning";
  }

  return "stale";
}

export function computeVariance(valueNumeric: number | null, targetValue: number | null, benchmarkValue: number | null) {
  if (typeof valueNumeric !== "number") {
    return null;
  }

  if (typeof targetValue === "number") {
    return valueNumeric - targetValue;
  }

  if (typeof benchmarkValue === "number") {
    return valueNumeric - benchmarkValue;
  }

  return null;
}

function dateInRange(targetDate: string, startDate?: string | null, endDate?: string | null) {
  const value = new Date(targetDate).getTime();
  const start = startDate ? new Date(startDate).getTime() : Number.NEGATIVE_INFINITY;
  const end = endDate ? new Date(endDate).getTime() : Number.POSITIVE_INFINITY;

  return value >= start && value <= end;
}

export function selectApplicableBenchmark(benchmarks: Benchmark[], metricValue: Pick<MetricValue, "metric_id" | "kpi_definition_id" | "as_of_date">) {
  return benchmarks
    .filter((benchmark) => {
      const metricMatches = benchmark.metric_id ? benchmark.metric_id === metricValue.metric_id : true;
      const kpiMatches = benchmark.kpi_definition_id ? benchmark.kpi_definition_id === metricValue.kpi_definition_id : true;
      return metricMatches && kpiMatches && dateInRange(metricValue.as_of_date, benchmark.benchmark_start, benchmark.benchmark_end);
    })
    .sort((left, right) => right.version - left.version)[0] ?? null;
}

function scopeMatches(target: Target, metricValue: Pick<MetricValue, "facility_id" | "department_id" | "service_line_id">) {
  if (target.department_id) {
    return target.department_id === metricValue.department_id;
  }

  if (target.service_line_id) {
    return target.service_line_id === metricValue.service_line_id;
  }

  if (target.facility_id) {
    return target.facility_id === metricValue.facility_id;
  }

  return true;
}

export function selectApplicableTarget(targets: Target[], metricValue: Pick<MetricValue, "metric_id" | "kpi_definition_id" | "facility_id" | "department_id" | "service_line_id" | "as_of_date">) {
  return targets
    .filter((target) => {
      const metricMatches = target.metric_id ? target.metric_id === metricValue.metric_id : true;
      const kpiMatches = target.kpi_definition_id ? target.kpi_definition_id === metricValue.kpi_definition_id : true;
      return metricMatches && kpiMatches && scopeMatches(target, metricValue) && dateInRange(metricValue.as_of_date, target.period_start, target.period_end);
    })
    .sort((left, right) => {
      const score = (candidate: Target) => Number(Boolean(candidate.department_id)) * 3 + Number(Boolean(candidate.service_line_id)) * 2 + Number(Boolean(candidate.facility_id));
      return score(right) - score(left);
    })[0] ?? null;
}

export function filterMetricValuesForScope(values: MetricValue[], filters: { facilityId?: string | null; departmentId?: string | null; serviceLineId?: string | null; status?: MetricValue["status"] | "all"; dateFrom?: string | null; dateTo?: string | null }) {
  return values.filter((value) => {
    if (filters.facilityId && value.facility_id !== filters.facilityId) {
      return false;
    }

    if (filters.departmentId && value.department_id !== filters.departmentId) {
      return false;
    }

    if (filters.serviceLineId && value.service_line_id !== filters.serviceLineId) {
      return false;
    }

    if (filters.status && filters.status !== "all" && value.status !== filters.status) {
      return false;
    }

    if (filters.dateFrom && new Date(value.as_of_date).getTime() < new Date(filters.dateFrom).getTime()) {
      return false;
    }

    if (filters.dateTo && new Date(value.as_of_date).getTime() > new Date(filters.dateTo).getTime()) {
      return false;
    }

    return true;
  });
}

export function resolveMetricAggregationGrain(metrics: Metric[], metricId: string) {
  return metrics.find((metric) => metric.id === metricId)?.description ?? null;
}
