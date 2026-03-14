import type {
  CurrentUserContext,
  Dashboard,
  DashboardFiltersInput,
  DashboardSummaryCard,
  DashboardWidgetInput,
  DashboardWorkspace,
  DashboardWidgetView,
  Metric,
  MetricValue,
  PublishedMetricValueRecord,
  TableInsert,
} from "@/types";

import { safeLogAuditEvent } from "@/lib/audit";
import { canAccessModule, requireAdminAccess } from "@/lib/auth/authorization";
import { requireCurrentUserContext } from "@/lib/auth/current-user";
import { ForbiddenError, NotFoundError } from "@/lib/http-errors";
import { benchmarkRepository } from "@/lib/repositories/benchmark.repository";
import { dashboardRepository } from "@/lib/repositories/dashboard.repository";
import { kpiRepository } from "@/lib/repositories/kpi.repository";
import { metricRepository } from "@/lib/repositories/metric.repository";
import { metricValueRepository } from "@/lib/repositories/metric-value.repository";
import { organizationRepository } from "@/lib/repositories/organization.repository";
import { targetRepository } from "@/lib/repositories/target.repository";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import {
  computeMetricFreshnessStatus,
  computeVariance,
  filterMetricValuesForScope,
  selectApplicableBenchmark,
  selectApplicableTarget,
} from "@/features/kpis/analytics.helpers";

const DEFAULT_WIDGET_BLUEPRINTS = [
  { widgetType: "summary", width: 6, height: 4, positionX: 0, positionY: 0 },
  { widgetType: "summary", width: 6, height: 4, positionX: 6, positionY: 0 },
  { widgetType: "trend", width: 6, height: 5, positionX: 0, positionY: 4 },
  { widgetType: "trend", width: 6, height: 5, positionX: 6, positionY: 4 },
] as const;

function normalizeOptionalText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
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

function getResolvedFilters(filters: DashboardFiltersInput = {}): Required<DashboardFiltersInput> {
  return {
    dashboardSlug: filters.dashboardSlug?.trim() ?? "",
    facilityId: filters.facilityId?.trim() ?? "",
    departmentId: filters.departmentId?.trim() ?? "",
    serviceLineId: filters.serviceLineId?.trim() ?? "",
    dateFrom: filters.dateFrom?.trim() || getDefaultDateFrom(),
    dateTo: filters.dateTo?.trim() || getDefaultDateTo(),
    status: filters.status ?? "published",
  };
}

function compareMetricValuesDesc(left: MetricValue, right: MetricValue) {
  return new Date(right.as_of_date).getTime() - new Date(left.as_of_date).getTime();
}

function getPrimaryRole(context: CurrentUserContext) {
  const prioritizedSlugs = [
    "system-administrator",
    "executive-user",
    "operations-manager",
    "finance-analyst",
    "clinical-quality-manager",
    "department-manager",
  ];

  for (const slug of prioritizedSlugs) {
    const role = context.roles.find((entry) => entry.slug === slug);
    if (role) {
      return role;
    }
  }

  return context.roles[0] ?? null;
}

function buildDefaultDashboardBlueprint(context: CurrentUserContext) {
  const primaryRole = getPrimaryRole(context);

  switch (primaryRole?.slug) {
    case "executive-user":
    case "system-administrator":
      return {
        name: "Executive Command Center",
        slug: "executive-command-center",
        description: "Enterprise performance across margin, operations, quality, and access.",
      };
    case "finance-analyst":
      return {
        name: "Finance Performance Board",
        slug: "finance-performance-board",
        description: "Margin, benchmark, and target performance for finance leaders.",
      };
    case "clinical-quality-manager":
      return {
        name: "Quality Surveillance Board",
        slug: "quality-surveillance-board",
        description: "Clinical quality performance with benchmark and threshold visibility.",
      };
    case "operations-manager":
      return {
        name: "Operations Watchfloor",
        slug: "operations-watchfloor",
        description: "Facility throughput, access, and operational stability signals.",
      };
    case "department-manager":
      return {
        name: "Department Performance Board",
        slug: "department-performance-board",
        description: "Department-level scorecards and operational trend tracking.",
      };
    default:
      return {
        name: "Performance Command Center",
        slug: "performance-command-center",
        description: "Default performance workspace for KPI scorecards and trends.",
      };
  }
}

function getDashboardSelection(dashboards: Dashboard[], context: CurrentUserContext, slug: string) {
  if (slug) {
    return dashboards.find((dashboard) => dashboard.slug === slug) ?? null;
  }

  const roleIds = new Set(context.roles.map((role) => role.id));
  const roleBased = dashboards.find((dashboard) => dashboard.audience_role_id && roleIds.has(dashboard.audience_role_id));
  if (roleBased) {
    return roleBased;
  }

  return dashboards.find((dashboard) => dashboard.is_default) ?? dashboards[0] ?? null;
}

async function requireDashboardReadContext() {
  const currentUser = await requireCurrentUserContext();
  const organizationId = currentUser.profile?.organization_id;

  if (!organizationId || !currentUser.organization) {
    throw new ForbiddenError("An organization context is required to view dashboards.");
  }

  if (!canAccessModule(currentUser, "dashboard") && !currentUser.canManageAdministration) {
    throw new ForbiddenError("Dashboard access is required to view this workspace.");
  }

  return {
    currentUser,
    organizationId,
    organization: currentUser.organization,
  };
}

async function ensureDefaultDashboard(context: CurrentUserContext, organizationId: string, metrics: Metric[]) {
  const adminClient = getSupabaseAdminClient();
  const dashboards = await dashboardRepository.listDashboards(adminClient, organizationId);
  if (dashboards.length > 0) {
    return dashboards;
  }

  const blueprint = buildDefaultDashboardBlueprint(context);
  const primaryRole = getPrimaryRole(context);
  const dashboard = await dashboardRepository.createDashboard(adminClient, {
    organization_id: organizationId,
    owner_user_id: context.profile?.id ?? null,
    audience_role_id: primaryRole?.id ?? null,
    name: blueprint.name,
    slug: blueprint.slug,
    description: blueprint.description,
    visibility: primaryRole ? "role_based" : "shared",
    is_default: true,
    filters_config: {},
    layout_config: {},
  });

  await ensureDefaultWidgets(adminClient, dashboard, metrics);
  await safeLogAuditEvent({
    organizationId,
    actorUserId: context.authUser.id,
    action: "dashboard.created",
    entityType: "dashboard",
    entityId: dashboard.id,
    scopeLevel: "organization",
    metadata: {
      slug: dashboard.slug,
      auto_generated: true,
    },
  });

  return [dashboard];
}

async function ensureDefaultWidgets(client: ReturnType<typeof getSupabaseAdminClient>, dashboard: Dashboard, metrics: Metric[]) {
  const widgets = await dashboardRepository.listDashboardWidgets(client, dashboard.id);
  if (widgets.length > 0 || metrics.length === 0) {
    return widgets;
  }

  const widgetMetrics = metrics.slice(0, DEFAULT_WIDGET_BLUEPRINTS.length);
  for (const [index, metric] of widgetMetrics.entries()) {
    const blueprint = DEFAULT_WIDGET_BLUEPRINTS[index] ?? DEFAULT_WIDGET_BLUEPRINTS[0];
    await dashboardRepository.createDashboardWidget(client, {
      dashboard_id: dashboard.id,
      metric_id: metric.id,
      report_id: null,
      title: metric.name,
      widget_type: blueprint.widgetType,
      position_x: blueprint.positionX,
      position_y: blueprint.positionY,
      width: blueprint.width,
      height: blueprint.height,
      config: {
        metric_code: metric.code,
        auto_generated: true,
      },
    });
  }

  return dashboardRepository.listDashboardWidgets(client, dashboard.id);
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

function getTrendDirection(trend: PublishedMetricValueRecord[]) {
  const numericValues = trend.map((entry) => entry.metricValue.value_numeric).filter((value): value is number => typeof value === "number");
  if (numericValues.length < 2) {
    return "flat" as const;
  }

  const delta = numericValues[numericValues.length - 1] - numericValues[0];
  if (delta > 0.01) {
    return "up" as const;
  }
  if (delta < -0.01) {
    return "down" as const;
  }
  return "flat" as const;
}

function buildSummaryCards(metrics: Metric[], values: PublishedMetricValueRecord[], widgetMetricIds: string[]): DashboardSummaryCard[] {
  const latestByMetric = new Map<string, PublishedMetricValueRecord>();
  for (const value of values) {
    if (!latestByMetric.has(value.metricValue.metric_id)) {
      latestByMetric.set(value.metricValue.metric_id, value);
    }
  }

  const metricOrder = [...widgetMetricIds, ...metrics.map((metric) => metric.id)].filter((value, index, all) => all.indexOf(value) === index);
  return metricOrder
    .map((metricId) => metrics.find((metric) => metric.id === metricId))
    .filter((metric): metric is Metric => Boolean(metric))
    .slice(0, 4)
    .map((metric) => {
      const latestValue = latestByMetric.get(metric.id) ?? null;
      const trend = values.filter((entry) => entry.metricValue.metric_id === metric.id).slice(0, 6).reverse();
      return {
        metric,
        kpiDefinition: latestValue?.kpiDefinition ?? null,
        latestValue,
        variance: latestValue?.metricValue.variance_value ?? null,
        trendDirection: getTrendDirection(trend),
      };
    });
}

async function getScopedWorkspace(filters: DashboardFiltersInput = {}): Promise<DashboardWorkspace> {
  const { currentUser, organizationId, organization } = await requireDashboardReadContext();
  const client = await getSupabaseServerClient();
  const adminClient = getSupabaseAdminClient();
  const resolvedFilters = getResolvedFilters(filters);

  const [metrics, facilities, departments, serviceLines] = await Promise.all([
    metricRepository.listMetrics(client, organizationId, 100),
    organizationRepository.listFacilities(client, organizationId, 100),
    organizationRepository.listDepartments(client, organizationId, 100),
    organizationRepository.listServiceLines(client, organizationId, 100),
  ]);

  const dashboards = await ensureDefaultDashboard(currentUser, organizationId, metrics.filter((metric) => metric.is_active));
  const dashboard = getDashboardSelection(dashboards, currentUser, resolvedFilters.dashboardSlug) ?? dashboards[0];

  if (!dashboard) {
    throw new NotFoundError("No dashboard is available for the current organization.");
  }

  let widgets = await dashboardRepository.listDashboardWidgets(client, dashboard.id);
  if (widgets.length === 0) {
    widgets = await ensureDefaultWidgets(adminClient, dashboard, metrics.filter((metric) => metric.is_active));
  }

  const [values, kpis, benchmarks, targets] = await Promise.all([
    metricValueRepository.listMetricValues(client, organizationId, 250),
    kpiRepository.listKpiDefinitions(client, organizationId, 100),
    benchmarkRepository.listBenchmarks(client, organizationId, 100),
    targetRepository.listTargets(client, organizationId, 100),
  ]);

  const filteredValues = filterMetricValuesForScope([...values].sort(compareMetricValuesDesc), {
    facilityId: resolvedFilters.facilityId || null,
    departmentId: resolvedFilters.departmentId || null,
    serviceLineId: resolvedFilters.serviceLineId || null,
    status: resolvedFilters.status,
    dateFrom: resolvedFilters.dateFrom || null,
    dateTo: resolvedFilters.dateTo || null,
  }).map((metricValue) => buildPublishedMetricValueRecord(metricValue, metrics, kpis, benchmarks, targets));

  const widgetViews: DashboardWidgetView[] = widgets.map((widget) => {
    const metric = metrics.find((entry) => entry.id === widget.metric_id) ?? null;
    const metricValues = filteredValues.filter((entry) => entry.metricValue.metric_id === widget.metric_id);
    const latestValue = metricValues[0] ?? null;
    const trend = [...metricValues].slice(0, 6).reverse();

    return {
      widget,
      metric,
      latestValue,
      trend,
    };
  });

  const widgetMetricIds = widgetViews.map((entry) => entry.metric?.id).filter((value): value is string => Boolean(value));
  const summaryCards = buildSummaryCards(metrics.filter((metric) => metric.is_active), filteredValues, widgetMetricIds);
  const staleWidgetCount = widgetViews.filter((entry) => entry.latestValue && entry.latestValue.freshness !== "fresh").length;
  const lastRefreshedAt = filteredValues[0]?.metricValue.as_of_date ?? null;

  return {
    organization,
    dashboards,
    dashboard,
    summaryCards,
    widgets: widgetViews,
    values: filteredValues,
    availableMetrics: metrics.filter((metric) => metric.is_active),
    facilities,
    departments,
    serviceLines,
    filters: resolvedFilters,
    staleWidgetCount,
    lastRefreshedAt,
  };
}

export async function listDashboardWorkspace(filters: DashboardFiltersInput = {}) {
  return getScopedWorkspace(filters);
}

export async function createDashboard(input: { name: string; slug?: string; description?: string; visibility?: Dashboard["visibility"] }) {
  const currentUser = await requireAdminAccess();
  const organizationId = currentUser.profile?.organization_id;

  if (!organizationId) {
    throw new ForbiddenError("An organization context is required to create dashboards.");
  }

  const adminClient = getSupabaseAdminClient();
  const baseSlug = slugify(input.slug?.trim() || input.name);
  const slug = baseSlug || `dashboard-${Date.now()}`;
  const existing = await dashboardRepository.getDashboardBySlug(adminClient, organizationId, slug);
  if (existing) {
    throw new Error("A dashboard with this slug already exists.");
  }

  const existingDashboards = await dashboardRepository.listDashboards(adminClient, organizationId);
  const primaryRole = getPrimaryRole(currentUser);
  const dashboard = await dashboardRepository.createDashboard(adminClient, {
    organization_id: organizationId,
    owner_user_id: currentUser.profile?.id ?? null,
    audience_role_id: input.visibility === "role_based" ? primaryRole?.id ?? null : null,
    name: input.name.trim(),
    slug,
    description: normalizeOptionalText(input.description),
    visibility: input.visibility ?? "shared",
    is_default: existingDashboards.length === 0,
    filters_config: {},
    layout_config: {},
  });

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "dashboard.created",
    entityType: "dashboard",
    entityId: dashboard.id,
    scopeLevel: "organization",
    metadata: {
      slug: dashboard.slug,
      visibility: dashboard.visibility,
    },
  });

  return dashboard;
}

async function resolveDashboardForMutation(dashboardSlug: string | undefined, organizationId: string, context: CurrentUserContext) {
  const adminClient = getSupabaseAdminClient();
  const dashboards = await ensureDefaultDashboard(context, organizationId, await metricRepository.listMetrics(adminClient, organizationId, 100));
  const dashboard = getDashboardSelection(dashboards, context, dashboardSlug?.trim() ?? "") ?? dashboards[0] ?? null;

  if (!dashboard) {
    throw new NotFoundError("No dashboard is available for the current organization.");
  }

  return dashboard;
}

export async function createDashboardWidget(input: DashboardWidgetInput & { dashboardSlug?: string | undefined }) {
  const currentUser = await requireAdminAccess();
  const organizationId = currentUser.profile?.organization_id;

  if (!organizationId) {
    throw new ForbiddenError("An organization context is required to configure dashboard widgets.");
  }

  const adminClient = getSupabaseAdminClient();
  const dashboard = await resolveDashboardForMutation(input.dashboardSlug, organizationId, currentUser);
  const metric = await metricRepository.getMetricById(adminClient, input.metricId);

  if (!metric || metric.organization_id !== organizationId) {
    throw new NotFoundError("The selected metric does not exist in the current organization.");
  }

  const widgets = await dashboardRepository.listDashboardWidgets(adminClient, dashboard.id);
  const width = input.widgetType === "trend" ? 6 : 4;
  const height = input.widgetType === "trend" ? 5 : 4;
  const widget = await dashboardRepository.createDashboardWidget(adminClient, {
    dashboard_id: dashboard.id,
    metric_id: metric.id,
    report_id: null,
    title: normalizeOptionalText(input.title) ?? metric.name,
    widget_type: input.widgetType ?? "summary",
    position_x: widgets.length % 2 === 0 ? 0 : 6,
    position_y: Math.floor(widgets.length / 2) * 5,
    width,
    height,
    config: {
      metric_code: metric.code,
      manual_title: Boolean(normalizeOptionalText(input.title)),
    },
  });

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "dashboard_widget.created",
    entityType: "dashboard_widget",
    entityId: widget.id,
    scopeLevel: "organization",
    metadata: {
      dashboard_id: dashboard.id,
      metric_id: metric.id,
      widget_type: widget.widget_type,
    },
  });

  return { widget, dashboard };
}

export async function deleteDashboardWidget(widgetId: string) {
  const currentUser = await requireAdminAccess();
  const organizationId = currentUser.profile?.organization_id;

  if (!organizationId) {
    throw new ForbiddenError("An organization context is required to remove dashboard widgets.");
  }

  const adminClient = getSupabaseAdminClient();
  const widget = await dashboardRepository.getDashboardWidgetById(adminClient, widgetId);

  if (!widget) {
    throw new NotFoundError("The selected widget does not exist.");
  }

  const dashboard = await dashboardRepository.getDashboardById(adminClient, widget.dashboard_id);
  if (!dashboard || dashboard.organization_id !== organizationId) {
    throw new NotFoundError("The selected widget does not belong to the current organization.");
  }

  const deleted = await dashboardRepository.deleteDashboardWidget(adminClient, widgetId);
  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "dashboard_widget.deleted",
    entityType: "dashboard_widget",
    entityId: deleted.id,
    scopeLevel: "organization",
    metadata: {
      dashboard_id: dashboard.id,
      metric_id: deleted.metric_id,
      widget_type: deleted.widget_type,
    },
  });

  return { widget: deleted, dashboard };
}

