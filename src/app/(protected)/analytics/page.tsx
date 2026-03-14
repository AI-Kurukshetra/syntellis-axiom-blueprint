import Link from "next/link";

import { PageHeader } from "@/components/ui/page-header";
import { getAnalyticsDomainLabel, listDomainAnalyticsWorkspace } from "@/features/analytics/analytics.service";
import { requireModuleAccess } from "@/lib/auth/authorization";
import type { AnalyticsDomainKey, DomainAnalyticsFiltersInput, PublishedMetricValueRecord } from "@/types";

const compareOptions = [
  { value: "organization", label: "Organization" },
  { value: "facility", label: "Facility" },
  { value: "department", label: "Department" },
  { value: "service_line", label: "Service line" },
] as const;

const domainTabs: AnalyticsDomainKey[] = ["financial", "operations", "clinical_quality", "revenue_cycle"];

type AnalyticsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatDate(value: string) {
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

function formatVariance(value: number | null, unit?: string | null) {
  if (typeof value !== "number") {
    return "No variance";
  }

  const absolute = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: unit === "ratio" ? 2 : 1,
    maximumFractionDigits: unit === "ratio" ? 2 : 1,
  }).format(Math.abs(value));

  return `${value >= 0 ? "+" : "-"}${absolute}${unit === "percent" ? "%" : ""}`;
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

function buildAnalyticsHref(filters: Partial<Required<DomainAnalyticsFiltersInput>>) {
  const query = new URLSearchParams();

  if (filters.domainTab) query.set("domainTab", filters.domainTab);
  if (filters.compareBy) query.set("compareBy", filters.compareBy);
  if (filters.dateFrom) query.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) query.set("dateTo", filters.dateTo);
  if (filters.facilityId) query.set("facilityId", filters.facilityId);
  if (filters.departmentId) query.set("departmentId", filters.departmentId);
  if (filters.serviceLineId) query.set("serviceLineId", filters.serviceLineId);
  if (filters.savedView) query.set("savedView", filters.savedView);

  const queryString = query.toString();
  return queryString ? `/analytics?${queryString}` : "/analytics";
}

function buildTabHref(current: Required<DomainAnalyticsFiltersInput>, domainTab: AnalyticsDomainKey) {
  return buildAnalyticsHref({
    domainTab,
    compareBy: current.compareBy,
    dateFrom: current.dateFrom,
    dateTo: current.dateTo,
    facilityId: current.facilityId,
    departmentId: current.departmentId,
    serviceLineId: current.serviceLineId,
  });
}

function buildSavedViewHref(view: { filters: Partial<Required<DomainAnalyticsFiltersInput>> }) {
  return buildAnalyticsHref(view.filters);
}

function buildExportHref(current: Required<DomainAnalyticsFiltersInput>) {
  const query = new URLSearchParams({
    source: "analytics",
    domainTab: current.domainTab,
    compareBy: current.compareBy,
    dateFrom: current.dateFrom,
    dateTo: current.dateTo,
  });

  if (current.facilityId) query.set("facilityId", current.facilityId);
  if (current.departmentId) query.set("departmentId", current.departmentId);
  if (current.serviceLineId) query.set("serviceLineId", current.serviceLineId);

  return `/api/exports?${query.toString()}`;
}

function getScopeTypeLabel(record: PublishedMetricValueRecord) {
  if (record.metricValue.department_id) {
    return "Department";
  }

  if (record.metricValue.service_line_id) {
    return "Service line";
  }

  if (record.metricValue.facility_id) {
    return "Facility";
  }

  return "Organization";
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  await requireModuleAccess("analytics");
  const params = await searchParams;
  const filters: DomainAnalyticsFiltersInput = {
    domainTab: (getFirstParam(params.domainTab) || undefined) as AnalyticsDomainKey | undefined,
    facilityId: getFirstParam(params.facilityId),
    departmentId: getFirstParam(params.departmentId),
    serviceLineId: getFirstParam(params.serviceLineId),
    dateFrom: getFirstParam(params.dateFrom),
    dateTo: getFirstParam(params.dateTo),
    compareBy: (getFirstParam(params.compareBy) || undefined) as DomainAnalyticsFiltersInput["compareBy"],
    savedView: getFirstParam(params.savedView),
  };
  const workspace = await listDomainAnalyticsWorkspace(filters);
  const activeDomainLabel = getAnalyticsDomainLabel(workspace.activeDomain);

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Phase 6"
        title={`${activeDomainLabel} analytics`}
        description="Curated domain views built from published metric values, benchmark context, and tenant-aware scope filters."
        action={
          <div className="pill-stack">
            <Link className="button button-secondary" href="/analytics/catalog">
              Open KPI catalog
            </Link>
            <a className="button button-primary" href={buildExportHref(workspace.filters)}>
              Export current view
            </a>
          </div>
        }
      />

      <section className="panel analytics-toolbar">
        <div className="pill-row analytics-tab-row">
          {domainTabs.map((domainTab) => (
            <Link
              key={domainTab}
              className={workspace.activeDomain === domainTab ? "pill primary" : "pill"}
              href={buildTabHref(workspace.filters, domainTab)}
            >
              {getAnalyticsDomainLabel(domainTab)}
            </Link>
          ))}
        </div>

        <form className="form-stack" method="get">
          <input type="hidden" name="domainTab" value={workspace.activeDomain} />
          <div className="form-grid analytics-filter-grid">
            <label className="field" htmlFor="facilityId">
              <span className="field-label">Facility</span>
              <select id="facilityId" name="facilityId" defaultValue={workspace.filters.facilityId}>
                <option value="">All facilities</option>
                {workspace.facilities.map((facility) => (
                  <option key={facility.id} value={facility.id}>
                    {facility.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field" htmlFor="departmentId">
              <span className="field-label">Department</span>
              <select id="departmentId" name="departmentId" defaultValue={workspace.filters.departmentId}>
                <option value="">All departments</option>
                {workspace.departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field" htmlFor="serviceLineId">
              <span className="field-label">Service line</span>
              <select id="serviceLineId" name="serviceLineId" defaultValue={workspace.filters.serviceLineId}>
                <option value="">All service lines</option>
                {workspace.serviceLines.map((serviceLine) => (
                  <option key={serviceLine.id} value={serviceLine.id}>
                    {serviceLine.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field" htmlFor="compareBy">
              <span className="field-label">Compare by</span>
              <select id="compareBy" name="compareBy" defaultValue={workspace.filters.compareBy}>
                {compareOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field" htmlFor="dateFrom">
              <span className="field-label">Date from</span>
              <input id="dateFrom" name="dateFrom" type="date" defaultValue={workspace.filters.dateFrom} />
            </label>
            <label className="field" htmlFor="dateTo">
              <span className="field-label">Date to</span>
              <input id="dateTo" name="dateTo" type="date" defaultValue={workspace.filters.dateTo} />
            </label>
          </div>
          <div className="form-actions">
            <Link className="button button-secondary" href={buildAnalyticsHref({ domainTab: workspace.activeDomain })}>
              Reset filters
            </Link>
            <button className="button button-primary" type="submit">
              Apply filters
            </button>
          </div>
        </form>
      </section>

      <section className="analytics-saved-grid">
        {workspace.savedViews.map((view) => (
          <article key={view.key} className="resource-card">
            <div className="panel-header">
              <div>
                <span className="resource-meta">Saved view</span>
                <h3>{view.label}</h3>
              </div>
              <Link className="button button-secondary" href={buildSavedViewHref(view)}>
                Open view
              </Link>
            </div>
            <p>{view.description}</p>
          </article>
        ))}
      </section>

      <div className="dashboard-kpi-grid">
        {workspace.summaryCards.length > 0 ? (
          workspace.summaryCards.map((card) => (
            <article key={card.metric.id} className="dashboard-kpi-card">
              <div className="dashboard-kpi-card__header">
                <div>
                  <span className="resource-meta">{card.metric.code}</span>
                  <h3>{card.metric.name}</h3>
                </div>
                <span className={card.latestValue?.freshness === "fresh" ? "pill primary" : "pill"}>{card.latestValue?.freshness ?? "pending"}</span>
              </div>
              <div className="dashboard-kpi-card__value">{formatMetricValue(card.latestValue)}</div>
              <div className="dashboard-kpi-card__meta">
                <span>{card.metric.domain}</span>
                <span>{card.latestValue ? formatDate(card.latestValue.metricValue.as_of_date) : "No publication date"}</span>
              </div>
              <div className="dashboard-sparkline" aria-hidden>
                {card.trend.length > 0 ? (
                  card.trend.map((entry, index) => {
                    const numericValue = entry.metricValue.value_numeric ?? 0;
                    const values = card.trend.map((trendEntry) => trendEntry.metricValue.value_numeric ?? 0);
                    const min = Math.min(...values);
                    const max = Math.max(...values);
                    const range = max - min || 1;
                    const height = Math.max(18, Math.round((((numericValue - min) / range) * 58) + 18));
                    return <span key={`${entry.metricValue.id}-${index}`} style={{ height: `${height}px` }} />;
                  })
                ) : (
                  <div className="dashboard-sparkline dashboard-sparkline--empty">No recent points</div>
                )}
              </div>
            </article>
          ))
        ) : (
          <div className="state-panel">
            <div className="state-panel__icon" aria-hidden>
              --
            </div>
            <h2 className="state-panel__title">No published metrics for this domain</h2>
            <p className="state-panel__description">Publish metric values or broaden the scope filters to populate the domain analytics workspace.</p>
          </div>
        )}
      </div>

      <div className="split-grid analytics-source-grid">
        <section className="panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">Comparison</span>
              <h2 className="section-title">Scope leaderboard</h2>
            </div>
            <p className="section-copy">Latest metric publications grouped by the selected comparison scope.</p>
          </div>
          {workspace.comparisonRows.length > 0 ? (
            <div className="signal-list">
              {workspace.comparisonRows.map((row) => (
                <div key={row.scopeKey} className="signal-row">
                  <div className="signal-row__label">
                    <strong>{row.scopeLabel}</strong>
                    <span>{row.latestValue ? `${formatDate(row.latestValue.metricValue.as_of_date)} - ${row.latestValue.metricValue.status}` : "No data"}</span>
                  </div>
                  <div className="pill-row">
                    <span className="signal-row__value">{formatMetricValue(row.latestValue)}</span>
                    <span className={`dashboard-delta dashboard-delta--${getVarianceTone(row.variance)}`}>
                      {formatVariance(row.variance, row.latestValue?.kpiDefinition?.unit_of_measure ?? null)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="collection-empty">No comparison rows are available for the current filter set.</p>
          )}
        </section>

        <section className="panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">Source footprint</span>
              <h2 className="section-title">Supporting datasets</h2>
            </div>
            <p className="section-copy">These counts reflect raw source tables currently available for deeper drill-through and reporting.</p>
          </div>
          <div className="stats-grid">
            <article className="stat-card">
              <span className="stat-label">Financial transactions</span>
              <strong className="stat-value">{workspace.rawCounts.financialTransactions}</strong>
            </article>
            <article className="stat-card">
              <span className="stat-label">Budget items</span>
              <strong className="stat-value">{workspace.rawCounts.budgetItems}</strong>
            </article>
            <article className="stat-card">
              <span className="stat-label">Clinical encounters</span>
              <strong className="stat-value">{workspace.rawCounts.clinicalEncounters}</strong>
            </article>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="section-header">
          <div>
            <span className="eyebrow">Detailed records</span>
            <h2 className="section-title">Filtered metric publications</h2>
          </div>
          <p className="section-copy">Use this table as the downstream source for report definitions and drill-through review.</p>
        </div>

        {workspace.detailRows.length > 0 ? (
          <div className="analytics-table-wrap">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>As of</th>
                  <th>Scope</th>
                  <th>Value</th>
                  <th>Target</th>
                  <th>Benchmark</th>
                  <th>Variance</th>
                  <th>Freshness</th>
                  <th>Report</th>
                </tr>
              </thead>
              <tbody>
                {workspace.detailRows.map((row) => (
                  <tr key={row.metricValue.id}>
                    <td>
                      <strong>{row.metric?.name ?? row.metricValue.metric_id}</strong>
                      <div className="resource-meta">{row.metric?.code ?? row.metricValue.metric_id}</div>
                    </td>
                    <td>{formatDate(row.metricValue.as_of_date)}</td>
                    <td>{getScopeTypeLabel(row)}</td>
                    <td>{formatMetricValue(row)}</td>
                    <td>{typeof row.metricValue.target_value === "number" ? row.metricValue.target_value : "n/a"}</td>
                    <td>{typeof row.metricValue.benchmark_value === "number" ? row.metricValue.benchmark_value : "n/a"}</td>
                    <td>{formatVariance(row.metricValue.variance_value ?? null, row.kpiDefinition?.unit_of_measure ?? null)}</td>
                    <td>{row.freshness}</td>
                    <td>
                      <Link className="module-card__link" href={`/reports?domain=${encodeURIComponent(row.metric?.domain ?? activeDomainLabel)}`}>
                        Open report builder
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="collection-empty">No detailed records are available for the current domain filters.</p>
        )}
      </section>
    </div>
  );
}
