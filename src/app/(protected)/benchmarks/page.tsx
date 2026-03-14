import Link from "next/link";

import { PageHeader } from "@/components/ui/page-header";
import {
  createBenchmarkAction,
  createTargetAction,
  deleteBenchmarkAction,
  deleteTargetAction,
  updateBenchmarkAction,
  updateTargetAction,
} from "@/features/kpis/reference.actions";
import { listKpiCatalog } from "@/features/kpis/kpi.service";
import { listAnalyticsScopeCatalog, listMetricValueCatalog } from "@/features/kpis/metric-value.service";
import { listMetricCatalog } from "@/features/kpis/metric.service";
import { listBenchmarkCatalog, listTargetCatalog } from "@/features/kpis/reference.service";
import { requireModuleAccess } from "@/lib/auth/authorization";
import type { PublishedMetricValueRecord } from "@/types";

type BenchmarksPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const benchmarkSourceOptions = ["internal", "external", "licensed", "customer_provided"] as const;
const domainOptions = ["Financial", "Operational", "Clinical Quality", "Revenue Cycle", "Benchmark"] as const;
const scopeLevelOptions = ["organization", "facility", "department", "service_line"] as const;
const redirectTo = "/benchmarks";

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatDate(value: string | null) {
  if (!value) {
    return "n/a";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatMetricValue(record: PublishedMetricValueRecord | null) {
  if (!record) {
    return "No data";
  }

  if (typeof record.metricValue.value_numeric === "number") {
    const unit = (record.kpiDefinition?.unit_of_measure ?? "").toLowerCase();
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: unit === "ratio" ? 2 : 1,
      maximumFractionDigits: unit === "ratio" ? 2 : 1,
    }).format(record.metricValue.value_numeric);

    return unit === "percent" ? `${formatted}%` : formatted;
  }

  return record.metricValue.value_text ?? "JSON";
}

function formatNumber(value: number | null, unit?: string | null) {
  if (typeof value !== "number") {
    return "n/a";
  }

  const normalizedUnit = (unit ?? "").toLowerCase();
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: normalizedUnit === "ratio" ? 2 : 1,
    maximumFractionDigits: normalizedUnit === "ratio" ? 2 : 1,
  }).format(value);

  return normalizedUnit === "percent" ? `${formatted}%` : formatted;
}

function formatVariance(value: number | null, unit?: string | null) {
  if (typeof value !== "number") {
    return "n/a";
  }

  const normalizedUnit = (unit ?? "").toLowerCase();
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: normalizedUnit === "ratio" ? 2 : 1,
    maximumFractionDigits: normalizedUnit === "ratio" ? 2 : 1,
  }).format(Math.abs(value));

  return `${value >= 0 ? "+" : "-"}${formatted}${normalizedUnit === "percent" ? "%" : ""}`;
}

function getVarianceTone(value: number | null) {
  if (typeof value !== "number") {
    return "neutral";
  }

  if (value > 0.01) {
    return "positive";
  }

  if (value < -0.01) {
    return "negative";
  }

  return "neutral";
}

function formatJson(value: unknown) {
  return value ? JSON.stringify(value, null, 2) : "";
}

function getScopeLabel(
  record: { facility_id: string | null; department_id: string | null; service_line_id: string | null; scope_level?: string | null },
  lookup: {
    facilities: Map<string, string>;
    departments: Map<string, string>;
    serviceLines: Map<string, string>;
  }
) {
  if (record.department_id) {
    return lookup.departments.get(record.department_id) ?? "Department scope";
  }

  if (record.service_line_id) {
    return lookup.serviceLines.get(record.service_line_id) ?? "Service line scope";
  }

  if (record.facility_id) {
    return lookup.facilities.get(record.facility_id) ?? "Facility scope";
  }

  return record.scope_level === "organization" ? "Organization" : "Organization scope";
}

function buildComparisonRows(values: PublishedMetricValueRecord[]) {
  const byIdentity = new Map<string, PublishedMetricValueRecord>();

  for (const value of values) {
    if (value.metricValue.status !== "published") {
      continue;
    }

    if (typeof value.metricValue.target_value !== "number" && typeof value.metricValue.benchmark_value !== "number") {
      continue;
    }

    const key = [
      value.metricValue.metric_id,
      value.metricValue.facility_id ?? "org",
      value.metricValue.department_id ?? "dept:none",
      value.metricValue.service_line_id ?? "sl:none",
    ].join(":");

    if (!byIdentity.has(key)) {
      byIdentity.set(key, value);
    }
  }

  return [...byIdentity.values()].slice(0, 12);
}

export default async function BenchmarksPage({ searchParams }: BenchmarksPageProps) {
  await requireModuleAccess("benchmarks");
  const params = await searchParams;
  const [benchmarkCatalog, targetCatalog, metricCatalog, kpiCatalog, scopeCatalog, metricValueCatalog] = await Promise.all([
    listBenchmarkCatalog(100),
    listTargetCatalog(100),
    listMetricCatalog(100),
    listKpiCatalog(100),
    listAnalyticsScopeCatalog(100),
    listMetricValueCatalog({ limit: 200, status: "published" }),
  ]);

  const message = getFirstParam(params.message);
  const error = getFirstParam(params.error);
  const selectedBenchmarkId = getFirstParam(params.benchmarkId);
  const selectedTargetId = getFirstParam(params.targetId);
  const selectedBenchmark = benchmarkCatalog.benchmarks.find((benchmark) => benchmark.id === selectedBenchmarkId) ?? null;
  const selectedTarget = targetCatalog.targets.find((target) => target.id === selectedTargetId) ?? null;

  const metricMap = new Map(metricCatalog.metrics.map((metric) => [metric.id, metric] as const));
  const kpiMap = new Map(kpiCatalog.definitions.map((definition) => [definition.id, definition] as const));
  const scopeLookup = {
    facilities: new Map(scopeCatalog.facilities.map((facility) => [facility.id, `${facility.name} - ${facility.code}`] as const)),
    departments: new Map(scopeCatalog.departments.map((department) => [department.id, `${department.name} - ${department.code}`] as const)),
    serviceLines: new Map(scopeCatalog.serviceLines.map((serviceLine) => [serviceLine.id, `${serviceLine.name} - ${serviceLine.code}`] as const)),
  };
  const comparisonRows = buildComparisonRows(metricValueCatalog.values);
  const metricsWithComparisons = new Set([
    ...benchmarkCatalog.benchmarks.map((benchmark) => benchmark.metric_id).filter((value): value is string => Boolean(value)),
    ...targetCatalog.targets.map((target) => target.metric_id).filter((value): value is string => Boolean(value)),
  ]).size;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Phase 10"
        title="Benchmarks & Planning"
        description="Manage benchmark references and scoped targets, then compare live metric publications against both from a single planning workspace."
        action={
          <div className="pill-stack">
            <span className="pill primary">{benchmarkCatalog.benchmarks.length} benchmarks</span>
            <span className="pill">{targetCatalog.targets.length} targets</span>
            <Link className="button button-secondary" href="/analytics/catalog">
              Open analytics catalog
            </Link>
          </div>
        }
      />

      {message ? <p className="form-message form-message--success">{message}</p> : null}
      {error ? <p className="form-message form-message--danger">{error}</p> : null}

      <section className="stats-grid">
        <article className="stat-card">
          <span className="stat-label">Benchmarks</span>
          <strong className="stat-value">{benchmarkCatalog.benchmarks.length}</strong>
        </article>
        <article className="stat-card">
          <span className="stat-label">Targets</span>
          <strong className="stat-value">{targetCatalog.targets.length}</strong>
        </article>
        <article className="stat-card">
          <span className="stat-label">Metrics with planning context</span>
          <strong className="stat-value">{metricsWithComparisons}</strong>
        </article>
        <article className="stat-card">
          <span className="stat-label">Published values with variance</span>
          <strong className="stat-value">{comparisonRows.length}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="section-header">
          <div>
            <span className="eyebrow">Variance watch</span>
            <h2 className="section-title">Actuals against targets and benchmarks</h2>
          </div>
          <p className="section-copy">This table uses current published metric values and the active benchmark or target overlays already resolved by the metric layer.</p>
        </div>

        {comparisonRows.length > 0 ? (
          <div className="analytics-table-wrap">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Scope</th>
                  <th>As of</th>
                  <th>Actual</th>
                  <th>Target</th>
                  <th>Benchmark</th>
                  <th>Variance</th>
                  <th>Freshness</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.metricValue.id}>
                    <td>
                      <strong>{row.metric?.name ?? row.metricValue.metric_id}</strong>
                      <div className="resource-meta">{row.metric?.code ?? row.metricValue.metric_id}</div>
                    </td>
                    <td>{getScopeLabel(row.metricValue, scopeLookup)}</td>
                    <td>{formatDate(row.metricValue.as_of_date)}</td>
                    <td>{formatMetricValue(row)}</td>
                    <td>{formatNumber(row.metricValue.target_value ?? null, row.kpiDefinition?.unit_of_measure ?? null)}</td>
                    <td>{formatNumber(row.metricValue.benchmark_value ?? null, row.kpiDefinition?.unit_of_measure ?? null)}</td>
                    <td>
                      <span className={`dashboard-delta dashboard-delta--${getVarianceTone(row.metricValue.variance_value ?? null)}`}>
                        {formatVariance(row.metricValue.variance_value ?? null, row.kpiDefinition?.unit_of_measure ?? null)}
                      </span>
                    </td>
                    <td>{row.freshness}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="collection-empty">Publish metric values with active targets or benchmarks to populate the variance view.</p>
        )}
      </section>

      <div className="split-grid">
        <section className="panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">Benchmark references</span>
              <h2 className="section-title">Create a benchmark</h2>
            </div>
            <p className="section-copy">Benchmarks can be linked to a metric, a KPI definition, or both.</p>
          </div>

          <form action={createBenchmarkAction} className="form-stack">
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <div className="form-grid">
              <label className="field" htmlFor="benchmarkMetricId">
                <span className="field-label">Metric</span>
                <select id="benchmarkMetricId" name="metricId" defaultValue="">
                  <option value="">None</option>
                  {metricCatalog.metrics.map((metric) => (
                    <option key={metric.id} value={metric.id}>
                      {metric.code} - {metric.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="benchmarkKpiDefinitionId">
                <span className="field-label">KPI definition</span>
                <select id="benchmarkKpiDefinitionId" name="kpiDefinitionId" defaultValue="">
                  <option value="">None</option>
                  {kpiCatalog.definitions.map((definition) => (
                    <option key={definition.id} value={definition.id}>
                      {definition.code} - v{definition.version}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="benchmarkName">
                <span className="field-label">Name</span>
                <input id="benchmarkName" name="name" type="text" placeholder="Industry median" required />
              </label>
              <label className="field" htmlFor="benchmarkSourceType">
                <span className="field-label">Source type</span>
                <select id="benchmarkSourceType" name="sourceType" defaultValue={benchmarkSourceOptions[0]}>
                  {benchmarkSourceOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="benchmarkDomain">
                <span className="field-label">Domain</span>
                <select id="benchmarkDomain" name="domain" defaultValue={domainOptions[0]}>
                  {domainOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="benchmarkValueNumeric">
                <span className="field-label">Numeric value</span>
                <input id="benchmarkValueNumeric" name="valueNumeric" type="number" step="0.0001" />
              </label>
              <label className="field" htmlFor="benchmarkVersion">
                <span className="field-label">Version</span>
                <input id="benchmarkVersion" name="version" type="number" min="1" defaultValue="1" required />
              </label>
              <label className="field" htmlFor="benchmarkStart">
                <span className="field-label">Benchmark start</span>
                <input id="benchmarkStart" name="benchmarkStart" type="date" />
              </label>
              <label className="field" htmlFor="benchmarkEnd">
                <span className="field-label">Benchmark end</span>
                <input id="benchmarkEnd" name="benchmarkEnd" type="date" />
              </label>
              <label className="field field--full" htmlFor="benchmarkComparisonMethod">
                <span className="field-label">Comparison method</span>
                <input id="benchmarkComparisonMethod" name="comparisonMethod" type="text" placeholder="Percentile rank or peer median" />
              </label>
              <label className="field field--full" htmlFor="benchmarkSourceReference">
                <span className="field-label">Source reference</span>
                <input id="benchmarkSourceReference" name="sourceReference" type="text" placeholder="CMS FY2026 peer median" />
              </label>
              <label className="field field--full" htmlFor="benchmarkValueJson">
                <span className="field-label">JSON payload</span>
                <textarea id="benchmarkValueJson" name="valueJson" rows={3} defaultValue="{}" />
              </label>
            </div>
            <div className="form-actions">
              <button className="button button-primary" type="submit">
                Create benchmark
              </button>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">Targets</span>
              <h2 className="section-title">Create a target</h2>
            </div>
            <p className="section-copy">Targets can be set at the organization, facility, department, or service-line level.</p>
          </div>

          <form action={createTargetAction} className="form-stack">
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <div className="form-grid">
              <label className="field" htmlFor="targetMetricId">
                <span className="field-label">Metric</span>
                <select id="targetMetricId" name="metricId" defaultValue="">
                  <option value="">None</option>
                  {metricCatalog.metrics.map((metric) => (
                    <option key={metric.id} value={metric.id}>
                      {metric.code} - {metric.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="targetKpiDefinitionId">
                <span className="field-label">KPI definition</span>
                <select id="targetKpiDefinitionId" name="kpiDefinitionId" defaultValue="">
                  <option value="">None</option>
                  {kpiCatalog.definitions.map((definition) => (
                    <option key={definition.id} value={definition.id}>
                      {definition.code} - v{definition.version}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="targetScopeLevel">
                <span className="field-label">Scope level</span>
                <select id="targetScopeLevel" name="scopeLevel" defaultValue={scopeLevelOptions[0]}>
                  {scopeLevelOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="targetFacilityId">
                <span className="field-label">Facility</span>
                <select id="targetFacilityId" name="facilityId" defaultValue="">
                  <option value="">None</option>
                  {scopeCatalog.facilities.map((facility) => (
                    <option key={facility.id} value={facility.id}>
                      {facility.name} - {facility.code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="targetDepartmentId">
                <span className="field-label">Department</span>
                <select id="targetDepartmentId" name="departmentId" defaultValue="">
                  <option value="">None</option>
                  {scopeCatalog.departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name} - {department.code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="targetServiceLineId">
                <span className="field-label">Service line</span>
                <select id="targetServiceLineId" name="serviceLineId" defaultValue="">
                  <option value="">None</option>
                  {scopeCatalog.serviceLines.map((serviceLine) => (
                    <option key={serviceLine.id} value={serviceLine.id}>
                      {serviceLine.name} - {serviceLine.code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="targetPeriodStart">
                <span className="field-label">Period start</span>
                <input id="targetPeriodStart" name="periodStart" type="date" required />
              </label>
              <label className="field" htmlFor="targetPeriodEnd">
                <span className="field-label">Period end</span>
                <input id="targetPeriodEnd" name="periodEnd" type="date" required />
              </label>
              <label className="field" htmlFor="targetTargetValue">
                <span className="field-label">Target value</span>
                <input id="targetTargetValue" name="targetValue" type="number" step="0.0001" required />
              </label>
              <label className="field" htmlFor="targetTolerancePercent">
                <span className="field-label">Tolerance percent</span>
                <input id="targetTolerancePercent" name="tolerancePercent" type="number" step="0.01" />
              </label>
              <label className="field field--full" htmlFor="targetNotes">
                <span className="field-label">Notes</span>
                <textarea id="targetNotes" name="notes" rows={3} placeholder="Optional planning notes." />
              </label>
            </div>
            <div className="form-actions">
              <button className="button button-primary" type="submit">
                Create target
              </button>
            </div>
          </form>
        </section>
      </div>

      <div className="split-grid">
        <section className="panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">Benchmarks</span>
              <h2 className="section-title">Benchmark library</h2>
            </div>
            <p className="section-copy">Use quick edit to revise an existing benchmark or remove outdated references.</p>
          </div>

          {benchmarkCatalog.benchmarks.length > 0 ? (
            <div className="signal-list">
              {benchmarkCatalog.benchmarks.map((benchmark) => (
                <div key={benchmark.id} className="signal-row">
                  <div className="signal-row__label">
                    <strong>{benchmark.name}</strong>
                    <span>
                      {(benchmark.metric_id && metricMap.get(benchmark.metric_id)?.code) ??
                        (benchmark.kpi_definition_id && kpiMap.get(benchmark.kpi_definition_id)?.code) ??
                        benchmark.domain}
                      {" - "}
                      {benchmark.source_type}
                      {" - v"}
                      {benchmark.version}
                    </span>
                  </div>
                  <div className="pill-row">
                    <Link className="button button-secondary" href={`/benchmarks?benchmarkId=${benchmark.id}`}>
                      Edit
                    </Link>
                    <form action={deleteBenchmarkAction}>
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <input type="hidden" name="benchmarkId" value={benchmark.id} />
                      <button className="button button-secondary" type="submit">
                        Remove
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="collection-empty">No benchmarks are configured yet.</p>
          )}
        </section>

        <section className="panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">Targets</span>
              <h2 className="section-title">Target library</h2>
            </div>
            <p className="section-copy">Scope-aware targets stay editable from this page and feed metric variance automatically.</p>
          </div>

          {targetCatalog.targets.length > 0 ? (
            <div className="signal-list">
              {targetCatalog.targets.map((target) => (
                <div key={target.id} className="signal-row">
                  <div className="signal-row__label">
                    <strong>{metricMap.get(target.metric_id ?? "")?.code ?? "Target"}</strong>
                    <span>
                      {getScopeLabel(target, scopeLookup)}
                      {" - "}
                      {target.period_start}
                      {" to "}
                      {target.period_end}
                      {" - "}
                      {target.target_value}
                    </span>
                  </div>
                  <div className="pill-row">
                    <Link className="button button-secondary" href={`/benchmarks?targetId=${target.id}`}>
                      Edit
                    </Link>
                    <form action={deleteTargetAction}>
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <input type="hidden" name="targetId" value={target.id} />
                      <button className="button button-secondary" type="submit">
                        Remove
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="collection-empty">No targets are configured yet.</p>
          )}
        </section>
      </div>

      {selectedBenchmark ? (
        <section className="panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">Edit benchmark</span>
              <h2 className="section-title">{selectedBenchmark.name}</h2>
            </div>
            <Link className="button button-secondary" href="/benchmarks">
              Close editor
            </Link>
          </div>

          <form action={updateBenchmarkAction} className="form-stack">
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <input type="hidden" name="benchmarkId" value={selectedBenchmark.id} />
            <div className="form-grid">
              <label className="field" htmlFor="editBenchmarkMetricId">
                <span className="field-label">Metric</span>
                <select id="editBenchmarkMetricId" name="metricId" defaultValue={selectedBenchmark.metric_id ?? ""}>
                  <option value="">None</option>
                  {metricCatalog.metrics.map((metric) => (
                    <option key={metric.id} value={metric.id}>
                      {metric.code} - {metric.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="editBenchmarkKpiDefinitionId">
                <span className="field-label">KPI definition</span>
                <select id="editBenchmarkKpiDefinitionId" name="kpiDefinitionId" defaultValue={selectedBenchmark.kpi_definition_id ?? ""}>
                  <option value="">None</option>
                  {kpiCatalog.definitions.map((definition) => (
                    <option key={definition.id} value={definition.id}>
                      {definition.code} - v{definition.version}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="editBenchmarkName">
                <span className="field-label">Name</span>
                <input id="editBenchmarkName" name="name" type="text" defaultValue={selectedBenchmark.name} required />
              </label>
              <label className="field" htmlFor="editBenchmarkSourceType">
                <span className="field-label">Source type</span>
                <select id="editBenchmarkSourceType" name="sourceType" defaultValue={selectedBenchmark.source_type}>
                  {benchmarkSourceOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="editBenchmarkDomain">
                <span className="field-label">Domain</span>
                <select id="editBenchmarkDomain" name="domain" defaultValue={selectedBenchmark.domain}>
                  {domainOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="editBenchmarkValueNumeric">
                <span className="field-label">Numeric value</span>
                <input id="editBenchmarkValueNumeric" name="valueNumeric" type="number" step="0.0001" defaultValue={selectedBenchmark.value_numeric ?? ""} />
              </label>
              <label className="field" htmlFor="editBenchmarkVersion">
                <span className="field-label">Version</span>
                <input id="editBenchmarkVersion" name="version" type="number" min="1" defaultValue={selectedBenchmark.version} required />
              </label>
              <label className="field" htmlFor="editBenchmarkStart">
                <span className="field-label">Benchmark start</span>
                <input id="editBenchmarkStart" name="benchmarkStart" type="date" defaultValue={selectedBenchmark.benchmark_start ?? ""} />
              </label>
              <label className="field" htmlFor="editBenchmarkEnd">
                <span className="field-label">Benchmark end</span>
                <input id="editBenchmarkEnd" name="benchmarkEnd" type="date" defaultValue={selectedBenchmark.benchmark_end ?? ""} />
              </label>
              <label className="field field--full" htmlFor="editBenchmarkComparisonMethod">
                <span className="field-label">Comparison method</span>
                <input id="editBenchmarkComparisonMethod" name="comparisonMethod" type="text" defaultValue={selectedBenchmark.comparison_method ?? ""} />
              </label>
              <label className="field field--full" htmlFor="editBenchmarkSourceReference">
                <span className="field-label">Source reference</span>
                <input id="editBenchmarkSourceReference" name="sourceReference" type="text" defaultValue={selectedBenchmark.source_reference ?? ""} />
              </label>
              <label className="field field--full" htmlFor="editBenchmarkValueJson">
                <span className="field-label">JSON payload</span>
                <textarea id="editBenchmarkValueJson" name="valueJson" rows={3} defaultValue={formatJson(selectedBenchmark.value_json)} />
              </label>
            </div>
            <div className="form-actions">
              <button className="button button-primary" type="submit">
                Save benchmark
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {selectedTarget ? (
        <section className="panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">Edit target</span>
              <h2 className="section-title">{metricMap.get(selectedTarget.metric_id ?? "")?.name ?? "Target"}</h2>
            </div>
            <Link className="button button-secondary" href="/benchmarks">
              Close editor
            </Link>
          </div>

          <form action={updateTargetAction} className="form-stack">
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <input type="hidden" name="targetId" value={selectedTarget.id} />
            <div className="form-grid">
              <label className="field" htmlFor="editTargetMetricId">
                <span className="field-label">Metric</span>
                <select id="editTargetMetricId" name="metricId" defaultValue={selectedTarget.metric_id ?? ""}>
                  <option value="">None</option>
                  {metricCatalog.metrics.map((metric) => (
                    <option key={metric.id} value={metric.id}>
                      {metric.code} - {metric.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="editTargetKpiDefinitionId">
                <span className="field-label">KPI definition</span>
                <select id="editTargetKpiDefinitionId" name="kpiDefinitionId" defaultValue={selectedTarget.kpi_definition_id ?? ""}>
                  <option value="">None</option>
                  {kpiCatalog.definitions.map((definition) => (
                    <option key={definition.id} value={definition.id}>
                      {definition.code} - v{definition.version}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="editTargetScopeLevel">
                <span className="field-label">Scope level</span>
                <select id="editTargetScopeLevel" name="scopeLevel" defaultValue={selectedTarget.scope_level}>
                  {scopeLevelOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="editTargetFacilityId">
                <span className="field-label">Facility</span>
                <select id="editTargetFacilityId" name="facilityId" defaultValue={selectedTarget.facility_id ?? ""}>
                  <option value="">None</option>
                  {scopeCatalog.facilities.map((facility) => (
                    <option key={facility.id} value={facility.id}>
                      {facility.name} - {facility.code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="editTargetDepartmentId">
                <span className="field-label">Department</span>
                <select id="editTargetDepartmentId" name="departmentId" defaultValue={selectedTarget.department_id ?? ""}>
                  <option value="">None</option>
                  {scopeCatalog.departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name} - {department.code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="editTargetServiceLineId">
                <span className="field-label">Service line</span>
                <select id="editTargetServiceLineId" name="serviceLineId" defaultValue={selectedTarget.service_line_id ?? ""}>
                  <option value="">None</option>
                  {scopeCatalog.serviceLines.map((serviceLine) => (
                    <option key={serviceLine.id} value={serviceLine.id}>
                      {serviceLine.name} - {serviceLine.code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="editTargetPeriodStart">
                <span className="field-label">Period start</span>
                <input id="editTargetPeriodStart" name="periodStart" type="date" defaultValue={selectedTarget.period_start} required />
              </label>
              <label className="field" htmlFor="editTargetPeriodEnd">
                <span className="field-label">Period end</span>
                <input id="editTargetPeriodEnd" name="periodEnd" type="date" defaultValue={selectedTarget.period_end} required />
              </label>
              <label className="field" htmlFor="editTargetTargetValue">
                <span className="field-label">Target value</span>
                <input id="editTargetTargetValue" name="targetValue" type="number" step="0.0001" defaultValue={selectedTarget.target_value} required />
              </label>
              <label className="field" htmlFor="editTargetTolerancePercent">
                <span className="field-label">Tolerance percent</span>
                <input id="editTargetTolerancePercent" name="tolerancePercent" type="number" step="0.01" defaultValue={selectedTarget.tolerance_percent ?? ""} />
              </label>
              <label className="field field--full" htmlFor="editTargetNotes">
                <span className="field-label">Notes</span>
                <textarea id="editTargetNotes" name="notes" rows={3} defaultValue={selectedTarget.notes ?? ""} />
              </label>
            </div>
            <div className="form-actions">
              <button className="button button-primary" type="submit">
                Save target
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}
