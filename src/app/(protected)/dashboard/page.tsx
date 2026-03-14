import Link from "next/link";

import { PageHeader } from "@/components/ui/page-header";
import {
  createDashboardAction,
  createDashboardWidgetAction,
  deleteDashboardWidgetAction,
} from "@/features/dashboards/dashboard.actions";
import { listDashboardWorkspace } from "@/features/dashboards/dashboard.service";
import { safeLogAuditEvent } from "@/lib/audit";
import { requireModuleAccess } from "@/lib/auth/authorization";
import { requireCurrentUserContext } from "@/lib/auth/current-user";
import type { DashboardFiltersInput, DashboardSummaryCard, DashboardWidgetView, PublishedMetricValueRecord } from "@/types";

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function buildDashboardHref(filters: Partial<Required<DashboardFiltersInput>> & { widgetId?: string | undefined }) {
  const query = new URLSearchParams();

  if (filters.dashboardSlug) query.set("dashboardSlug", filters.dashboardSlug);
  if (filters.facilityId) query.set("facilityId", filters.facilityId);
  if (filters.departmentId) query.set("departmentId", filters.departmentId);
  if (filters.serviceLineId) query.set("serviceLineId", filters.serviceLineId);
  if (filters.dateFrom) query.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) query.set("dateTo", filters.dateTo);
  if (filters.status) query.set("status", filters.status);
  if (filters.widgetId) query.set("widgetId", filters.widgetId);

  const queryString = query.toString();
  return queryString ? `/dashboard?${queryString}` : "/dashboard";
}

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatDate(value: string | null) {
  if (!value) {
    return "No refresh yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatMetricValue(record: PublishedMetricValueRecord | null, fallbackUnit?: string | null) {
  if (!record) {
    return "No data";
  }

  if (typeof record.metricValue.value_numeric === "number") {
    const unit = (record.kpiDefinition?.unit_of_measure ?? fallbackUnit ?? "").toLowerCase();
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: unit === "ratio" ? 2 : 1,
      maximumFractionDigits: unit === "ratio" ? 2 : 1,
    }).format(record.metricValue.value_numeric);

    if (unit === "percent") {
      return `${formatted}%`;
    }

    return formatted;
  }

  return record.metricValue.value_text ?? "JSON";
}

function formatNumericValue(value: number | null, unit?: string | null) {
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
    return "No variance";
  }

  const absolute = Math.abs(value);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: unit === "ratio" ? 2 : 1,
    maximumFractionDigits: unit === "ratio" ? 2 : 1,
  }).format(absolute);

  return `${value >= 0 ? "+" : "-"}${formatted}${unit === "percent" ? "%" : ""}`;
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

function getScopeLabel(widget: DashboardWidgetView) {
  const latestValue = widget.latestValue?.metricValue;
  if (!latestValue) {
    return "Organization scope";
  }

  if (latestValue.department_id) {
    return "Department scope";
  }

  if (latestValue.service_line_id) {
    return "Service line scope";
  }

  if (latestValue.facility_id) {
    return "Facility scope";
  }

  return "Organization scope";
}

function getRecordScopeLabel(record: PublishedMetricValueRecord) {
  if (record.metricValue.department_id) {
    return "Department scope";
  }

  if (record.metricValue.service_line_id) {
    return "Service line scope";
  }

  if (record.metricValue.facility_id) {
    return "Facility scope";
  }

  return "Organization scope";
}

function buildAnalyticsHref(widget: DashboardWidgetView, filters: Required<DashboardFiltersInput>) {
  const domainTab = (widget.metric?.domain ?? "Financial").toLowerCase().replace(/[^a-z]+/g, "_");
  const query = new URLSearchParams({
    domainTab,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  });

  if (filters.facilityId) query.set("facilityId", filters.facilityId);
  if (filters.departmentId) query.set("departmentId", filters.departmentId);
  if (filters.serviceLineId) query.set("serviceLineId", filters.serviceLineId);

  return `/analytics?${query.toString()}`;
}

function buildReportHref(widget: DashboardWidgetView) {
  const domain = widget.metric?.domain ?? "Financial";
  return `/reports?domain=${encodeURIComponent(domain)}`;
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length === 0) {
    return <div className="dashboard-sparkline dashboard-sparkline--empty">No recent points</div>;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  return (
    <div className="dashboard-sparkline" aria-hidden>
      {points.map((point, index) => {
        const height = Math.max(18, Math.round(((point - min) / range) * 58) + 18);
        return <span key={`${point}-${index}`} style={{ height: `${height}px` }} />;
      })}
    </div>
  );
}

function KpiSummaryCard({ card }: { card: DashboardSummaryCard }) {
  const unit = card.kpiDefinition?.unit_of_measure ?? null;
  const varianceTone = getVarianceTone(card.variance);

  return (
    <article className="dashboard-kpi-card">
      <div className="dashboard-kpi-card__header">
        <div>
          <span className="resource-meta">{card.metric.code}</span>
          <h3>{card.metric.name}</h3>
        </div>
        <span className={`pill ${card.latestValue?.freshness === "fresh" ? "primary" : ""}`}>{card.latestValue?.freshness ?? "pending"}</span>
      </div>
      <div className="dashboard-kpi-card__value">{formatMetricValue(card.latestValue, unit)}</div>
      <div className="dashboard-kpi-card__meta">
        <span>{card.kpiDefinition?.domain ?? card.metric.domain}</span>
        <span>{formatDate(card.latestValue?.metricValue.as_of_date ?? null)}</span>
      </div>
      <div className="dashboard-kpi-card__footer">
        <span className={`dashboard-delta dashboard-delta--${varianceTone}`}>{formatVariance(card.variance, unit)}</span>
        <span className={`dashboard-trend dashboard-trend--${card.trendDirection}`}>{card.trendDirection} trend</span>
      </div>
    </article>
  );
}

function DashboardWidgetCard({
  widget,
  canManage,
  dashboardSlug,
  widgetHref,
  analyticsHref,
  isSelected,
}: {
  widget: DashboardWidgetView;
  canManage: boolean;
  dashboardSlug: string;
  widgetHref: string;
  analyticsHref: string;
  isSelected: boolean;
}) {
  const unit = widget.latestValue?.kpiDefinition?.unit_of_measure ?? null;
  const varianceTone = getVarianceTone(widget.latestValue?.metricValue.variance_value ?? null);
  const points = widget.trend.map((entry) => entry.metricValue.value_numeric).filter((value): value is number => typeof value === "number");
  const gridStyle = {
    gridColumn: `span ${Math.min(widget.widget.width, 12)}`,
    gridRow: `span ${Math.min(widget.widget.height, 6)}`,
  } as const;

  return (
    <article className="dashboard-widget" style={gridStyle}>
      <div className="dashboard-widget__header">
        <div>
          <span className="resource-meta">{widget.metric?.code ?? "Unlinked metric"}</span>
          <h3>{widget.widget.title}</h3>
        </div>
        <div className="pill-row">
          <span className={`pill ${widget.latestValue?.freshness === "fresh" ? "primary" : ""}`}>{widget.latestValue?.freshness ?? "pending"}</span>
          <span className="pill">{widget.widget.widget_type}</span>
        </div>
      </div>

      <div className="dashboard-widget__body">
        <div className="dashboard-widget__value-row">
          <div>
            <div className="dashboard-widget__value">{formatMetricValue(widget.latestValue, unit)}</div>
            <div className="dashboard-widget__subvalue">{getScopeLabel(widget)} - {formatDate(widget.latestValue?.metricValue.as_of_date ?? null)}</div>
          </div>
          <span className={`dashboard-delta dashboard-delta--${varianceTone}`}>{formatVariance(widget.latestValue?.metricValue.variance_value ?? null, unit)}</span>
        </div>

        <Sparkline points={points} />

        <div className="dashboard-widget__stats">
          <div className="dashboard-widget__stat">
            <span className="meta-row__label">Target</span>
            <strong>{typeof widget.latestValue?.metricValue.target_value === "number" ? formatNumericValue(widget.latestValue.metricValue.target_value, unit) : "n/a"}</strong>
          </div>
          <div className="dashboard-widget__stat">
            <span className="meta-row__label">Benchmark</span>
            <strong>{typeof widget.latestValue?.metricValue.benchmark_value === "number" ? formatNumericValue(widget.latestValue.metricValue.benchmark_value, unit) : "n/a"}</strong>
          </div>
          <div className="dashboard-widget__stat">
            <span className="meta-row__label">Status</span>
            <strong>{widget.latestValue?.metricValue.status ?? "pending"}</strong>
          </div>
        </div>
      </div>

      <div className="dashboard-widget__footer">
        <Link className={isSelected ? "button button-primary" : "button button-secondary"} href={widgetHref}>
          {isSelected ? "Viewing detail" : "View drill-down"}
        </Link>
        <Link className="button button-secondary" href={analyticsHref}>
          Open in analytics
        </Link>
        {canManage ? (
          <form action={deleteDashboardWidgetAction}>
            <input type="hidden" name="widgetId" value={widget.widget.id} />
            <input type="hidden" name="dashboardSlug" value={dashboardSlug} />
            <button className="button button-secondary" type="submit">
              Remove widget
            </button>
          </form>
        ) : null}
      </div>
    </article>
  );
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const access = await requireModuleAccess("dashboard");
  const currentUser = await requireCurrentUserContext();
  const params = await searchParams;
  const filters: DashboardFiltersInput = {
    dashboardSlug: getFirstParam(params.dashboardSlug),
    facilityId: getFirstParam(params.facilityId),
    departmentId: getFirstParam(params.departmentId),
    serviceLineId: getFirstParam(params.serviceLineId),
    dateFrom: getFirstParam(params.dateFrom),
    dateTo: getFirstParam(params.dateTo),
    status: (getFirstParam(params.status) || undefined) as DashboardFiltersInput["status"],
  };
  const workspace = await listDashboardWorkspace(filters);
  const message = getFirstParam(params.message);
  const error = getFirstParam(params.error);
  const selectedWidgetId = getFirstParam(params.widgetId);
  const hasActiveFilters = Boolean(
    workspace.filters.facilityId ||
      workspace.filters.departmentId ||
      workspace.filters.serviceLineId ||
      workspace.filters.status !== "published"
  );
  const selectedWidget = workspace.widgets.find((widget) => widget.widget.id === selectedWidgetId) ?? null;
  const selectedWidgetRows = selectedWidget?.metric ? workspace.values.filter((value) => value.metricValue.metric_id === selectedWidget.metric?.id).slice(0, 12) : [];

  await safeLogAuditEvent({
    organizationId: workspace.organization?.id ?? currentUser.profile?.organization_id ?? null,
    actorUserId: currentUser.authUser.id,
    action: "dashboard.viewed",
    entityType: "dashboard",
    entityId: workspace.dashboard.id,
    scopeLevel: workspace.filters.departmentId ? "department" : workspace.filters.serviceLineId ? "service_line" : workspace.filters.facilityId ? "facility" : "organization",
    facilityId: workspace.filters.facilityId || null,
    departmentId: workspace.filters.departmentId || null,
    metadata: {
      dashboard_slug: workspace.dashboard.slug,
      widget_id: selectedWidget?.widget.id ?? null,
      status: workspace.filters.status,
      date_from: workspace.filters.dateFrom,
      date_to: workspace.filters.dateTo,
    },
  });

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Phase 5"
        title={workspace.dashboard.name}
        description={workspace.dashboard.description ?? "Role-based performance workspace with live KPI scorecards and trend widgets."}
        action={
          <div className="pill-stack">
            <span className="pill primary">{workspace.values.length} live values</span>
            <span className="pill">{workspace.staleWidgetCount} stale widgets</span>
            <span className="pill">Refreshed {formatDate(workspace.lastRefreshedAt)}</span>
          </div>
        }
      />

      {message ? <p className="form-message form-message--success">{message}</p> : null}
      {error ? <p className="form-message form-message--danger">{error}</p> : null}

      <section className="dashboard-hero panel">
        <div className="dashboard-hero__copy">
          <span className="eyebrow">Executive scorecard</span>
          <h2>{workspace.organization?.name ?? "Organization"}</h2>
          <p>The dashboard blends KPI cards, trend widgets, targets, and benchmark context for fast operating reviews.</p>
          <div className="dashboard-hero__meta">
            <div>
              <span className="meta-row__label">Default board</span>
              <strong>{workspace.dashboard.is_default ? "Yes" : "No"}</strong>
            </div>
            <div>
              <span className="meta-row__label">Visibility</span>
              <strong>{workspace.dashboard.visibility}</strong>
            </div>
            <div>
              <span className="meta-row__label">Scope</span>
              <strong>{hasActiveFilters ? "Filtered" : "Enterprise"}</strong>
            </div>
          </div>
        </div>
        <div className="dashboard-hero__signal-grid">
          <div className="dashboard-signal-card">
            <span className="resource-meta">Cards</span>
            <strong>{workspace.summaryCards.length}</strong>
            <p>Live KPI cards with freshness and variance context.</p>
          </div>
          <div className="dashboard-signal-card">
            <span className="resource-meta">Widgets</span>
            <strong>{workspace.widgets.length}</strong>
            <p>Persistent dashboard modules tied to stored widget records.</p>
          </div>
          <div className="dashboard-signal-card">
            <span className="resource-meta">Filters</span>
            <strong>{hasActiveFilters ? "Scoped" : "Default"}</strong>
            <p>Organization, facility, department, service line, and date range filters.</p>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-header">
          <div>
            <span className="eyebrow">Filters</span>
            <h2 className="section-title">Refine the dashboard scope</h2>
          </div>
          <p className="section-copy">Filters are applied directly to live metric values before card and widget rendering.</p>
        </div>

        <form className="form-stack" method="get">
          <div className="form-grid dashboard-filter-grid">
            <label className="field" htmlFor="dashboardSlug">
              <span className="field-label">Dashboard</span>
              <select id="dashboardSlug" name="dashboardSlug" defaultValue={workspace.dashboard.slug}>
                {workspace.dashboards.map((dashboard) => (
                  <option key={dashboard.id} value={dashboard.slug}>
                    {dashboard.name}
                  </option>
                ))}
              </select>
            </label>
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
            <label className="field" htmlFor="status">
              <span className="field-label">Publication status</span>
              <select id="status" name="status" defaultValue={workspace.filters.status}>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="superseded">Superseded</option>
                <option value="all">All</option>
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
            <Link className="button button-secondary" href="/dashboard">
              Reset filters
            </Link>
            <button className="button button-primary" type="submit">
              Apply filters
            </button>
          </div>
        </form>
      </section>

      {access.canManageAdministration ? (
        <div className="dashboard-admin-grid">
          <section className="panel">
            <div className="section-header">
              <div>
                <span className="eyebrow">Workspace control</span>
                <h2 className="section-title">Create another dashboard</h2>
              </div>
            </div>
            <form action={createDashboardAction} className="form-stack">
              <div className="form-grid">
                <label className="field" htmlFor="newDashboardName">
                  <span className="field-label">Name</span>
                  <input id="newDashboardName" name="name" type="text" placeholder="Finance command center" required />
                </label>
                <label className="field" htmlFor="newDashboardSlug">
                  <span className="field-label">Slug</span>
                  <input id="newDashboardSlug" name="slug" type="text" placeholder="finance-command-center" />
                </label>
                <label className="field" htmlFor="newDashboardVisibility">
                  <span className="field-label">Visibility</span>
                  <select id="newDashboardVisibility" name="visibility" defaultValue="shared">
                    <option value="shared">Shared</option>
                    <option value="role_based">Role based</option>
                    <option value="private">Private</option>
                  </select>
                </label>
                <label className="field field--full" htmlFor="newDashboardDescription">
                  <span className="field-label">Description</span>
                  <textarea id="newDashboardDescription" name="description" rows={3} placeholder="Focus this board on a business unit, role, or operating review cadence." />
                </label>
              </div>
              <div className="form-actions">
                <button className="button button-primary" type="submit">
                  Create dashboard
                </button>
              </div>
            </form>
          </section>

          <section className="panel">
            <div className="section-header">
              <div>
                <span className="eyebrow">Widget config</span>
                <h2 className="section-title">Add a persistent widget</h2>
              </div>
            </div>
            <form action={createDashboardWidgetAction} className="form-stack">
              <input type="hidden" name="dashboardSlug" value={workspace.dashboard.slug} />
              <div className="form-grid">
                <label className="field" htmlFor="widgetMetricId">
                  <span className="field-label">Metric</span>
                  <select id="widgetMetricId" name="metricId" defaultValue="" required>
                    <option value="" disabled>
                      Select a metric
                    </option>
                    {workspace.availableMetrics.map((metric) => (
                      <option key={metric.id} value={metric.id}>
                        {metric.code} - {metric.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field" htmlFor="widgetType">
                  <span className="field-label">Widget type</span>
                  <select id="widgetType" name="widgetType" defaultValue="summary">
                    <option value="summary">Summary</option>
                    <option value="trend">Trend</option>
                  </select>
                </label>
                <label className="field field--full" htmlFor="widgetTitle">
                  <span className="field-label">Custom title</span>
                  <input id="widgetTitle" name="title" type="text" placeholder="Optional label override" />
                </label>
              </div>
              <div className="form-actions">
                <button className="button button-primary" type="submit">
                  Add widget
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      <section className="panel">
        <div className="section-header">
          <div>
            <span className="eyebrow">KPI cards</span>
            <h2 className="section-title">Top scorecard metrics</h2>
          </div>
          <p className="section-copy">These cards are derived from the latest filtered metric values, with target and benchmark variance applied.</p>
        </div>

        <div className="dashboard-kpi-grid">
          {workspace.summaryCards.map((card) => (
            <KpiSummaryCard key={card.metric.id} card={card} />
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-header">
          <div>
            <span className="eyebrow">Persistent widgets</span>
            <h2 className="section-title">Live dashboard workspace</h2>
          </div>
          <p className="section-copy">Widgets are backed by `dashboard_widgets` and render current trend and variance context from `metric_values`.</p>
        </div>

        {workspace.widgets.length > 0 ? (
          <div className="dashboard-widget-grid">
            {workspace.widgets.map((widget) => (
              <DashboardWidgetCard
                key={widget.widget.id}
                widget={widget}
                canManage={access.canManageAdministration}
                dashboardSlug={workspace.dashboard.slug}
                analyticsHref={buildAnalyticsHref(widget, workspace.filters)}
                widgetHref={buildDashboardHref({ ...workspace.filters, dashboardSlug: workspace.dashboard.slug, widgetId: widget.widget.id })}
                isSelected={selectedWidget?.widget.id === widget.widget.id}
              />
            ))}
          </div>
        ) : (
          <div className="state-panel">
            <div className="state-panel__icon" aria-hidden>
              --
            </div>
            <h2 className="state-panel__title">No widgets on this dashboard</h2>
            <p className="state-panel__description">Add widgets from the configuration panel to build a scorecard tailored to this role or operating review.</p>
          </div>
        )}
      </section>

      {selectedWidget ? (
        <section className="panel dashboard-drilldown-panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">Widget drill-down</span>
              <h2 className="section-title">{selectedWidget.widget.title}</h2>
            </div>
            <div className="pill-row">
              <span className="pill">{selectedWidget.metric?.code ?? "Metric"}</span>
              <span className={`pill ${selectedWidget.latestValue?.freshness === "fresh" ? "primary" : ""}`}>{selectedWidget.latestValue?.freshness ?? "pending"}</span>
              <Link className="button button-secondary" href={buildDashboardHref({ ...workspace.filters, dashboardSlug: workspace.dashboard.slug })}>
                Clear drill-down
              </Link>
            </div>
          </div>

          <div className="dashboard-drilldown-grid">
            <article className="resource-card">
              <div className="panel-header">
                <div>
                  <span className="resource-meta">Latest publication</span>
                  <h3>{formatMetricValue(selectedWidget.latestValue, selectedWidget.latestValue?.kpiDefinition?.unit_of_measure ?? null)}</h3>
                </div>
                <span className={`dashboard-delta dashboard-delta--${getVarianceTone(selectedWidget.latestValue?.metricValue.variance_value ?? null)}`}>
                  {formatVariance(selectedWidget.latestValue?.metricValue.variance_value ?? null, selectedWidget.latestValue?.kpiDefinition?.unit_of_measure ?? null)}
                </span>
              </div>
              <p>{getScopeLabel(selectedWidget)} - {formatDate(selectedWidget.latestValue?.metricValue.as_of_date ?? null)}</p>
              <div className="dashboard-widget__stats">
                <div className="dashboard-widget__stat">
                  <span className="meta-row__label">Target</span>
                  <strong>{typeof selectedWidget.latestValue?.metricValue.target_value === "number" ? formatNumericValue(selectedWidget.latestValue.metricValue.target_value, selectedWidget.latestValue?.kpiDefinition?.unit_of_measure ?? null) : "n/a"}</strong>
                </div>
                <div className="dashboard-widget__stat">
                  <span className="meta-row__label">Benchmark</span>
                  <strong>{typeof selectedWidget.latestValue?.metricValue.benchmark_value === "number" ? formatNumericValue(selectedWidget.latestValue.metricValue.benchmark_value, selectedWidget.latestValue?.kpiDefinition?.unit_of_measure ?? null) : "n/a"}</strong>
                </div>
                <div className="dashboard-widget__stat">
                  <span className="meta-row__label">Trend points</span>
                  <strong>{selectedWidget.trend.length}</strong>
                </div>
              </div>
            </article>

            <article className="resource-card">
              <div className="panel-header">
                <div>
                  <span className="resource-meta">Next actions</span>
                  <h3>Follow the metric</h3>
                </div>
              </div>
              <p>Keep the same tenant scope while moving into analytics or report building.</p>
              <div className="pill-stack">
                <Link className="button button-secondary" href={buildAnalyticsHref(selectedWidget, workspace.filters)}>
                  Open analytics view
                </Link>
                <Link className="button button-secondary" href={buildReportHref(selectedWidget)}>
                  Open report builder
                </Link>
              </div>
            </article>
          </div>

          {selectedWidgetRows.length > 0 ? (
            <div className="analytics-table-wrap">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>As of</th>
                    <th>Scope</th>
                    <th>Actual</th>
                    <th>Target</th>
                    <th>Benchmark</th>
                    <th>Variance</th>
                    <th>Status</th>
                    <th>Freshness</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedWidgetRows.map((row) => (
                    <tr key={row.metricValue.id}>
                      <td>{formatDate(row.metricValue.as_of_date)}</td>
                      <td>{getRecordScopeLabel(row)}</td>
                      <td>{formatMetricValue(row, row.kpiDefinition?.unit_of_measure ?? null)}</td>
                      <td>{typeof row.metricValue.target_value === "number" ? formatNumericValue(row.metricValue.target_value, row.kpiDefinition?.unit_of_measure ?? null) : "n/a"}</td>
                      <td>{typeof row.metricValue.benchmark_value === "number" ? formatNumericValue(row.metricValue.benchmark_value, row.kpiDefinition?.unit_of_measure ?? null) : "n/a"}</td>
                      <td>{formatVariance(row.metricValue.variance_value ?? null, row.kpiDefinition?.unit_of_measure ?? null)}</td>
                      <td>{row.metricValue.status}</td>
                      <td>{row.freshness}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="collection-empty">No scoped metric publications are available for this widget under the current filters.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
