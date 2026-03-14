import type {
  Json,
  Metric,
  PublishedMetricValueRecord,
  Report,
  ReportDatasetRow,
  ReportInput,
  ReportQueryInput,
  ReportRunInput,
  ReportRunView,
  ReportScheduleInput,
  ReportScheduleView,
  ReportWorkspace,
  TableInsert,
  UserProfile,
} from "@/types";

import { safeLogAuditEvent } from "@/lib/audit";
import { canAccessModule } from "@/lib/auth/authorization";
import { requireCurrentUserContext } from "@/lib/auth/current-user";
import { toCsv } from "@/lib/csv";
import { ForbiddenError, NotFoundError } from "@/lib/http-errors";
import { benchmarkRepository } from "@/lib/repositories/benchmark.repository";
import { kpiRepository } from "@/lib/repositories/kpi.repository";
import { metricRepository } from "@/lib/repositories/metric.repository";
import { metricValueRepository } from "@/lib/repositories/metric-value.repository";
import { organizationRepository } from "@/lib/repositories/organization.repository";
import { profileRepository } from "@/lib/repositories/profile.repository";
import { reportRepository } from "@/lib/repositories/report.repository";
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

const defaultColumns = [
  "metricName",
  "metricCode",
  "asOfDate",
  "value",
  "targetValue",
  "benchmarkValue",
  "varianceValue",
  "status",
] as const;

function normalizeOptional(value?: string | null) {
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

function parseRecord(value: Json | null | undefined): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function parseArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function getReportConfig(report: Report) {
  const definition = parseRecord(report.definition);
  const datasetConfig = parseRecord(report.dataset_config);

  return {
    columns: parseArray(definition.columns).filter(Boolean),
    metricIds: parseArray(datasetConfig.metricIds).filter(Boolean),
    domain: typeof datasetConfig.domain === "string" ? datasetConfig.domain : "Financial",
    facilityId: typeof datasetConfig.facilityId === "string" ? datasetConfig.facilityId : "",
    departmentId: typeof datasetConfig.departmentId === "string" ? datasetConfig.departmentId : "",
    serviceLineId: typeof datasetConfig.serviceLineId === "string" ? datasetConfig.serviceLineId : "",
    dateFrom: typeof datasetConfig.dateFrom === "string" ? datasetConfig.dateFrom : getDefaultDateFrom(),
    dateTo: typeof datasetConfig.dateTo === "string" ? datasetConfig.dateTo : getDefaultDateTo(),
    status: typeof datasetConfig.status === "string" ? datasetConfig.status : "published",
  };
}

function formatNumeric(value: number | null, unit?: string | null) {
  if (typeof value !== "number") {
    return "";
  }

  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: unit === "ratio" ? 2 : 1,
    maximumFractionDigits: unit === "ratio" ? 2 : 1,
  }).format(value);

  return unit === "percent" ? `${formatted}%` : formatted;
}

async function requireReportsContext() {
  const currentUser = await requireCurrentUserContext();
  const organizationId = currentUser.profile?.organization_id;

  if (!organizationId || !currentUser.organization) {
    throw new ForbiddenError("An organization context is required to work with reports.");
  }

  if (!canAccessModule(currentUser, "reports") && !currentUser.canManageAdministration) {
    throw new ForbiddenError("Reports access is required to view or manage reports.");
  }

  return {
    currentUser,
    organizationId,
    organization: currentUser.organization,
  };
}

function buildReportInsert(input: ReportInput, organizationId: string, ownerUserId: string): TableInsert<"reports"> {
  const slug = slugify(input.slug?.trim() || input.name);

  return {
    organization_id: organizationId,
    owner_user_id: ownerUserId,
    name: input.name.trim(),
    slug,
    description: normalizeOptional(input.description),
    visibility: input.visibility ?? "shared",
    definition: {
      columns: input.columns ?? [...defaultColumns],
    },
    dataset_config: {
      domain: input.domain,
      metricIds: input.metricIds ?? [],
      facilityId: normalizeOptional(input.facilityId),
      departmentId: normalizeOptional(input.departmentId),
      serviceLineId: normalizeOptional(input.serviceLineId),
      dateFrom: normalizeOptional(input.dateFrom) ?? getDefaultDateFrom(),
      dateTo: normalizeOptional(input.dateTo) ?? getDefaultDateTo(),
      status: input.status ?? "published",
    },
    visualization_config: {
      view: "table",
      sortBy: "as_of_date",
      sortDirection: "desc",
    },
    published_at: new Date().toISOString(),
  };
}

async function ensureDefaultReports(organizationId: string, ownerUserId: string, metrics: Metric[]) {
  const adminClient = getSupabaseAdminClient();
  const reports = await reportRepository.listReports(adminClient, organizationId, 20);
  if (reports.length > 0 || metrics.length === 0) {
    return reports;
  }

  const metricsByDomain = new Map<string, Metric[]>();
  for (const metric of metrics.filter((entry) => entry.is_active)) {
    const list = metricsByDomain.get(metric.domain) ?? [];
    list.push(metric);
    metricsByDomain.set(metric.domain, list);
  }

  const created: Report[] = [];
  for (const [domain, domainMetrics] of metricsByDomain.entries()) {
    const report = await reportRepository.createReport(
      adminClient,
      buildReportInsert(
        {
          name: `${domain} Performance Report`,
          slug: `${slugify(domain)}-performance-report`,
          description: `Auto-generated baseline report for ${domain.toLowerCase()} review.`,
          visibility: "shared",
          domain,
          metricIds: domainMetrics.slice(0, 4).map((metric) => metric.id),
          dateFrom: getDefaultDateFrom(),
          dateTo: getDefaultDateTo(),
          status: "published",
          columns: [...defaultColumns],
        },
        organizationId,
        ownerUserId
      )
    );
    created.push(report);
  }

  return created;
}

function buildPublishedMetricValueRecord(
  metricValue: Awaited<ReturnType<typeof metricValueRepository.listMetricValues>>[number],
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

function buildReportDatasetRows(
  report: Report,
  values: Awaited<ReturnType<typeof metricValueRepository.listMetricValues>>,
  metrics: Metric[],
  kpis: Awaited<ReturnType<typeof kpiRepository.listKpiDefinitions>>,
  benchmarks: Awaited<ReturnType<typeof benchmarkRepository.listBenchmarks>>,
  targets: Awaited<ReturnType<typeof targetRepository.listTargets>>,
  facilities: Awaited<ReturnType<typeof organizationRepository.listFacilities>>,
  departments: Awaited<ReturnType<typeof organizationRepository.listDepartments>>,
  serviceLines: Awaited<ReturnType<typeof organizationRepository.listServiceLines>>
): ReportDatasetRow[] {
  const config = getReportConfig(report);
  const scopedValues = filterMetricValuesForScope(values, {
    facilityId: config.facilityId || null,
    departmentId: config.departmentId || null,
    serviceLineId: config.serviceLineId || null,
    status: config.status as "draft" | "published" | "superseded" | "all",
    dateFrom: config.dateFrom,
    dateTo: config.dateTo,
  })
    .filter((value) => config.metricIds.length === 0 || config.metricIds.includes(value.metric_id))
    .sort((left, right) => new Date(right.as_of_date).getTime() - new Date(left.as_of_date).getTime())
    .slice(0, 200);

  return scopedValues.map((metricValue) => {
    const enriched = buildPublishedMetricValueRecord(metricValue, metrics, kpis, benchmarks, targets);
    const facility = facilities.find((item) => item.id === enriched.metricValue.facility_id);
    const department = departments.find((item) => item.id === enriched.metricValue.department_id);
    const serviceLine = serviceLines.find((item) => item.id === enriched.metricValue.service_line_id);
    const unit = enriched.kpiDefinition?.unit_of_measure ?? null;

    return {
      asOfDate: enriched.metricValue.as_of_date,
      periodStart: enriched.metricValue.period_start,
      periodEnd: enriched.metricValue.period_end,
      metricCode: enriched.metric?.code ?? enriched.metricValue.metric_id,
      metricName: enriched.metric?.name ?? "Metric",
      domain: enriched.metric?.domain ?? config.domain,
      facilityName: facility?.name ?? null,
      departmentName: department?.name ?? null,
      serviceLineName: serviceLine?.name ?? null,
      status: enriched.metricValue.status,
      value: formatNumeric(enriched.metricValue.value_numeric, unit) || enriched.metricValue.value_text || "JSON",
      targetValue: formatNumeric(enriched.metricValue.target_value, unit),
      benchmarkValue: formatNumeric(enriched.metricValue.benchmark_value, unit),
      varianceValue: formatNumeric(enriched.metricValue.variance_value, unit),
      freshness: enriched.freshness,
    };
  });
}

async function loadReportDependencies(organizationId: string) {
  const client = await getSupabaseServerClient();
  return Promise.all([
    metricRepository.listMetrics(client, organizationId, 100),
    metricValueRepository.listMetricValues(client, organizationId, 300),
    kpiRepository.listKpiDefinitions(client, organizationId, 100),
    benchmarkRepository.listBenchmarks(client, organizationId, 100),
    targetRepository.listTargets(client, organizationId, 100),
    organizationRepository.listFacilities(client, organizationId, 100),
    organizationRepository.listDepartments(client, organizationId, 100),
    organizationRepository.listServiceLines(client, organizationId, 100),
    profileRepository.listProfilesByOrganization(client, organizationId, 100),
  ]);
}

async function resolveManagedReport(reportId: string, organizationId: string) {
  const adminClient = getSupabaseAdminClient();
  const report = await reportRepository.getReportById(adminClient, reportId);

  if (!report || report.organization_id !== organizationId) {
    throw new NotFoundError("The selected report does not exist in the current organization.");
  }

  return report;
}

export async function listReportWorkspace(filters: ReportQueryInput = {}): Promise<ReportWorkspace> {
  const { currentUser, organizationId, organization } = await requireReportsContext();
  const client = await getSupabaseServerClient();
  const [metrics, values, kpis, benchmarks, targets, facilities, departments, serviceLines, users] = await loadReportDependencies(organizationId);
  const reports = await ensureDefaultReports(organizationId, currentUser.profile?.id ?? currentUser.authUser.id, metrics);
  const reportList = reports.length > 0 ? reports : await reportRepository.listReports(client, organizationId, 50);
  const activeReport =
    (filters.reportSlug ? reportList.find((report) => report.slug === filters.reportSlug) : null) ?? reportList[0] ?? null;

  const schedules = activeReport ? await reportRepository.listReportSchedules(client, organizationId, activeReport.id) : [];
  const runs = activeReport ? await reportRepository.listReportRuns(client, organizationId, activeReport.id) : [];
  const datasetRows = activeReport
    ? buildReportDatasetRows(activeReport, values, metrics, kpis, benchmarks, targets, facilities, departments, serviceLines)
    : [];
  const scheduleViews: ReportScheduleView[] = schedules.map((schedule) => {
    const recipientConfig = parseRecord(schedule.recipient_config);
    const recipientIds = parseArray(recipientConfig.userIds);
    return {
      schedule,
      recipients: users.filter((user) => recipientIds.includes(user.id)),
    };
  });
  const runViews: ReportRunView[] = runs.map((run) => ({
    run,
    triggeredBy: users.find((user) => user.id === run.triggered_by) ?? null,
  }));

  return {
    organization,
    reports: reportList,
    activeReport,
    datasetRows,
    schedules: scheduleViews,
    runs: runViews,
    availableMetrics: metrics.filter((metric) => metric.is_active),
    availableUsers: users,
    facilities,
    departments,
    serviceLines,
    filters: {
      reportSlug: filters.reportSlug?.trim() ?? "",
    },
  };
}

export async function createReport(input: ReportInput) {
  const { currentUser, organizationId } = await requireReportsContext();
  const adminClient = getSupabaseAdminClient();
  const reportInsert = buildReportInsert(input, organizationId, currentUser.profile?.id ?? currentUser.authUser.id);
  const existing = await reportRepository.getReportBySlug(adminClient, organizationId, reportInsert.slug);

  if (existing) {
    throw new Error("A report with this slug already exists.");
  }

  const report = await reportRepository.createReport(adminClient, reportInsert);
  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "report.created",
    entityType: "report",
    entityId: report.id,
    scopeLevel: "organization",
    metadata: {
      slug: report.slug,
      visibility: report.visibility,
    },
  });

  return report;
}

export async function updateReport(reportId: string, input: ReportInput) {
  const { currentUser, organizationId } = await requireReportsContext();
  const adminClient = getSupabaseAdminClient();
  const existing = await resolveManagedReport(reportId, organizationId);
  const nextSlug = slugify(input.slug?.trim() || input.name);
  const duplicate = await reportRepository.getReportBySlug(adminClient, organizationId, nextSlug);

  if (duplicate && duplicate.id !== existing.id) {
    throw new Error("A report with this slug already exists.");
  }

  const report = await reportRepository.updateReport(adminClient, reportId, {
    name: input.name.trim(),
    slug: nextSlug,
    description: normalizeOptional(input.description),
    visibility: input.visibility ?? existing.visibility,
    definition: {
      columns: input.columns ?? [...defaultColumns],
    },
    dataset_config: {
      domain: input.domain,
      metricIds: input.metricIds ?? [],
      facilityId: normalizeOptional(input.facilityId),
      departmentId: normalizeOptional(input.departmentId),
      serviceLineId: normalizeOptional(input.serviceLineId),
      dateFrom: normalizeOptional(input.dateFrom) ?? getDefaultDateFrom(),
      dateTo: normalizeOptional(input.dateTo) ?? getDefaultDateTo(),
      status: input.status ?? "published",
    },
    visualization_config: {
      view: "table",
      sortBy: "as_of_date",
      sortDirection: "desc",
    },
    published_at: new Date().toISOString(),
  });

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "report.updated",
    entityType: "report",
    entityId: report.id,
    scopeLevel: "organization",
    metadata: {
      slug: report.slug,
      visibility: report.visibility,
    },
  });

  return report;
}

export async function deleteReport(reportId: string) {
  const { currentUser, organizationId } = await requireReportsContext();
  const adminClient = getSupabaseAdminClient();
  const report = await resolveManagedReport(reportId, organizationId);
  const deleted = await reportRepository.deleteReport(adminClient, reportId);

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "report.deleted",
    entityType: "report",
    entityId: deleted.id,
    scopeLevel: "organization",
    metadata: {
      slug: report.slug,
    },
  });

  return deleted;
}

export async function createReportSchedule(input: ReportScheduleInput) {
  const { currentUser, organizationId } = await requireReportsContext();
  const adminClient = getSupabaseAdminClient();
  const report = await resolveManagedReport(input.reportId, organizationId);
  const recipients = await profileRepository.listProfilesByIds(adminClient, input.recipientUserIds);

  if (recipients.length !== new Set(input.recipientUserIds).size || recipients.some((recipient) => recipient.organization_id !== organizationId)) {
    throw new Error("Select only recipients who belong to the current organization.");
  }

  const schedule = await reportRepository.createReportSchedule(adminClient, {
    organization_id: organizationId,
    report_id: report.id,
    frequency: input.frequency,
    cron_expression: normalizeOptional(input.cronExpression),
    delivery_channels: input.deliveryChannels ?? ["email"],
    recipient_config: {
      userIds: recipients.map((recipient) => recipient.id),
      emails: recipients.map((recipient) => recipient.work_email).filter(Boolean),
      validatedAt: new Date().toISOString(),
    },
    format: input.format,
    is_active: input.isActive ?? true,
    next_run_at: null,
    last_run_at: null,
  });

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "report_schedule.created",
    entityType: "report_schedule",
    entityId: schedule.id,
    scopeLevel: "organization",
    metadata: {
      report_id: report.id,
      frequency: schedule.frequency,
      format: schedule.format,
      recipient_count: recipients.length,
    },
  });

  return schedule;
}

export async function deleteReportSchedule(scheduleId: string) {
  const { currentUser, organizationId } = await requireReportsContext();
  const adminClient = getSupabaseAdminClient();
  const schedule = await reportRepository.getReportScheduleById(adminClient, scheduleId);

  if (!schedule || schedule.organization_id !== organizationId) {
    throw new NotFoundError("The selected report schedule does not exist in the current organization.");
  }

  const deleted = await reportRepository.deleteReportSchedule(adminClient, scheduleId);
  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "report_schedule.deleted",
    entityType: "report_schedule",
    entityId: deleted.id,
    scopeLevel: "organization",
    metadata: {
      report_id: deleted.report_id,
      format: deleted.format,
    },
  });

  return deleted;
}

export async function runReport(input: ReportRunInput) {
  const { currentUser, organizationId } = await requireReportsContext();
  const adminClient = getSupabaseAdminClient();
  const report = await resolveManagedReport(input.reportId, organizationId);

  if (input.format !== "csv") {
    throw new Error("CSV is the supported export format in the current implementation.");
  }

  const run = await reportRepository.createReportRun(adminClient, {
    organization_id: organizationId,
    report_id: report.id,
    report_schedule_id: null,
    triggered_by: currentUser.profile?.id ?? currentUser.authUser.id,
    format: input.format,
    status: "running",
    started_at: new Date().toISOString(),
    completed_at: null,
    output_path: null,
    row_count: null,
    error_details: {},
  });

  const workspace = await listReportWorkspace({ reportSlug: report.slug });
  const completed = await reportRepository.updateReportRun(adminClient, run.id, {
    status: "succeeded",
    completed_at: new Date().toISOString(),
    output_path: `/api/reports/export?reportId=${report.id}&format=csv&runId=${run.id}`,
    row_count: workspace.datasetRows.length,
  });

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "report.run",
    entityType: "report_run",
    entityId: completed.id,
    scopeLevel: "organization",
    metadata: {
      report_id: report.id,
      format: completed.format,
      row_count: completed.row_count,
    },
  });

  return completed;
}

export async function exportReportCsv(reportId: string) {
  const { currentUser, organizationId } = await requireReportsContext();
  const report = await resolveManagedReport(reportId, organizationId);
  const workspace = await listReportWorkspace({ reportSlug: report.slug });
  const csv = toCsv(
    [
      "Metric Name",
      "Metric Code",
      "Domain",
      "As Of",
      "Period Start",
      "Period End",
      "Facility",
      "Department",
      "Service Line",
      "Status",
      "Value",
      "Target",
      "Benchmark",
      "Variance",
      "Freshness",
    ],
    workspace.datasetRows.map((row) => [
      row.metricName,
      row.metricCode,
      row.domain,
      row.asOfDate,
      row.periodStart,
      row.periodEnd,
      row.facilityName,
      row.departmentName,
      row.serviceLineName,
      row.status,
      row.value,
      row.targetValue,
      row.benchmarkValue,
      row.varianceValue,
      row.freshness,
    ])
  );

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "report.exported",
    entityType: "report",
    entityId: report.id,
    scopeLevel: "organization",
    metadata: {
      format: "csv",
      row_count: workspace.datasetRows.length,
    },
  });

  return {
    report,
    csv,
    rowCount: workspace.datasetRows.length,
  };
}
