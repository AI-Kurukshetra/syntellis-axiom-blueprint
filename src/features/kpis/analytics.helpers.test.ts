import { describe, expect, it } from "vitest";

import { computeMetricFreshnessStatus, computeVariance, filterMetricValuesForScope, selectApplicableBenchmark, selectApplicableTarget } from "@/features/kpis/analytics.helpers";
import type { Benchmark, MetricValue, Target } from "@/types";

describe("analytics.helpers", () => {
  it("computes freshness by aggregation grain", () => {
    expect(computeMetricFreshnessStatus("2026-03-13", "daily", new Date("2026-03-14"))).toBe("fresh");
    expect(computeMetricFreshnessStatus("2026-02-20", "daily", new Date("2026-03-14"))).toBe("stale");
    expect(computeMetricFreshnessStatus("2026-02-20", "monthly", new Date("2026-03-14"))).toBe("fresh");
  });

  it("computes variance with target precedence over benchmark", () => {
    expect(computeVariance(110, 100, 95)).toBe(10);
    expect(computeVariance(110, null, 95)).toBe(15);
    expect(computeVariance(null, 100, 95)).toBeNull();
  });

  it("selects the most specific applicable target", () => {
    const targets = [
      {
        id: "1",
        organization_id: "org",
        metric_id: "metric-1",
        kpi_definition_id: null,
        scope_level: "organization",
        facility_id: null,
        department_id: null,
        service_line_id: null,
        owner_user_id: null,
        period_start: "2026-01-01",
        period_end: "2026-12-31",
        target_value: 100,
        tolerance_percent: null,
        notes: null,
        created_at: "",
        updated_at: "",
      },
      {
        id: "2",
        organization_id: "org",
        metric_id: "metric-1",
        kpi_definition_id: null,
        scope_level: "facility",
        facility_id: "facility-1",
        department_id: null,
        service_line_id: null,
        owner_user_id: null,
        period_start: "2026-01-01",
        period_end: "2026-12-31",
        target_value: 120,
        tolerance_percent: null,
        notes: null,
        created_at: "",
        updated_at: "",
      },
    ] satisfies Target[];

    const selected = selectApplicableTarget(targets, {
      metric_id: "metric-1",
      kpi_definition_id: null,
      facility_id: "facility-1",
      department_id: null,
      service_line_id: null,
      as_of_date: "2026-03-01",
    });

    expect(selected?.id).toBe("2");
  });

  it("selects the highest benchmark version in range", () => {
    const benchmarks = [
      {
        id: "1",
        organization_id: "org",
        metric_id: "metric-1",
        kpi_definition_id: null,
        name: "Median",
        source_type: "licensed",
        domain: "Financial",
        comparison_method: null,
        value_numeric: 90,
        value_json: null,
        source_reference: null,
        benchmark_start: "2026-01-01",
        benchmark_end: "2026-12-31",
        version: 1,
        created_at: "",
        updated_at: "",
      },
      {
        id: "2",
        organization_id: "org",
        metric_id: "metric-1",
        kpi_definition_id: null,
        name: "Median v2",
        source_type: "licensed",
        domain: "Financial",
        comparison_method: null,
        value_numeric: 95,
        value_json: null,
        source_reference: null,
        benchmark_start: "2026-01-01",
        benchmark_end: "2026-12-31",
        version: 2,
        created_at: "",
        updated_at: "",
      },
    ] satisfies Benchmark[];

    const selected = selectApplicableBenchmark(benchmarks, {
      metric_id: "metric-1",
      kpi_definition_id: null,
      as_of_date: "2026-04-01",
    });

    expect(selected?.id).toBe("2");
  });

  it("filters metric values by scope and date", () => {
    const values = [
      {
        id: "1",
        organization_id: "org",
        metric_id: "metric-1",
        kpi_definition_id: null,
        facility_id: "facility-1",
        department_id: null,
        service_line_id: null,
        ingestion_job_id: null,
        period_start: null,
        period_end: null,
        as_of_date: "2026-03-01",
        value_numeric: 10,
        value_text: null,
        value_json: null,
        target_value: null,
        benchmark_value: null,
        variance_value: null,
        status: "published",
        lineage: {},
        created_at: "",
      },
      {
        id: "2",
        organization_id: "org",
        metric_id: "metric-1",
        kpi_definition_id: null,
        facility_id: "facility-2",
        department_id: null,
        service_line_id: null,
        ingestion_job_id: null,
        period_start: null,
        period_end: null,
        as_of_date: "2026-01-01",
        value_numeric: 5,
        value_text: null,
        value_json: null,
        target_value: null,
        benchmark_value: null,
        variance_value: null,
        status: "draft",
        lineage: {},
        created_at: "",
      },
    ] satisfies MetricValue[];

    const filtered = filterMetricValuesForScope(values, {
      facilityId: "facility-1",
      status: "published",
      dateFrom: "2026-02-01",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("1");
  });
});
