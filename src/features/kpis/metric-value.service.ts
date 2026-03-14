import type { AnalyticsScopeCatalog, Json, MetricValueCatalog, MetricValuePublishInput, MetricValueQueryInput, TableInsert } from "@/types";

import { safeLogAuditEvent } from "@/lib/audit";
import { canAccessModule, requireAdminAccess } from "@/lib/auth/authorization";
import { requireCurrentUserContext } from "@/lib/auth/current-user";
import { ForbiddenError, NotFoundError } from "@/lib/http-errors";
import { benchmarkRepository } from "@/lib/repositories/benchmark.repository";
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

function normalizeOptionalText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeOptionalDate(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function parseOptionalJson(value?: string | null) {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  try {
    return JSON.parse(normalized) as Json;
  } catch {
    throw new Error("Enter valid JSON.");
  }
}

function parseLineage(value?: string | null) {
  const parsed = parseOptionalJson(value);
  return parsed ?? {};
}

function assertAtLeastOneMetricValue(input: MetricValuePublishInput) {
  const hasValue = typeof input.valueNumeric === "number" || Boolean(input.valueText?.trim()) || Boolean(input.valueJson?.trim());

  if (!hasValue) {
    throw new Error("Provide at least one metric value payload.");
  }
}

async function requireMetricReadContext() {
  const currentUser = await requireCurrentUserContext();
  const organizationId = currentUser.profile?.organization_id;

  if (!organizationId || !currentUser.organization) {
    throw new ForbiddenError("An organization context is required to work with metric values.");
  }

  if (!canAccessModule(currentUser, "analytics") && !currentUser.canManageAdministration) {
    throw new ForbiddenError("Analytics access is required to view metric values.");
  }

  return {
    currentUser,
    organizationId,
    organization: currentUser.organization,
  };
}

async function resolveMetric(metricId: string, organizationId: string) {
  const adminClient = getSupabaseAdminClient();
  const metric = await metricRepository.getMetricById(adminClient, metricId);

  if (!metric || metric.organization_id !== organizationId) {
    throw new NotFoundError("The selected metric does not exist in the current organization.");
  }

  return metric;
}

async function resolveScope(input: MetricValuePublishInput, organizationId: string) {
  const adminClient = getSupabaseAdminClient();
  const facilityId = input.facilityId?.trim() || null;
  const departmentId = input.departmentId?.trim() || null;
  const serviceLineId = input.serviceLineId?.trim() || null;

  if (facilityId) {
    const facility = await organizationRepository.getFacilityById(adminClient, facilityId);
    if (!facility || facility.organization_id !== organizationId) {
      throw new NotFoundError("The selected facility does not exist in the current organization.");
    }
  }

  if (departmentId) {
    const department = await organizationRepository.getDepartmentById(adminClient, departmentId);
    if (!department || department.organization_id !== organizationId) {
      throw new NotFoundError("The selected department does not exist in the current organization.");
    }
  }

  if (serviceLineId) {
    const serviceLine = await organizationRepository.getServiceLineById(adminClient, serviceLineId);
    if (!serviceLine || serviceLine.organization_id !== organizationId) {
      throw new NotFoundError("The selected service line does not exist in the current organization.");
    }
  }

  return { facilityId, departmentId, serviceLineId };
}

function mapMetricValueInsert(
  input: MetricValuePublishInput,
  organizationId: string,
  metricId: string,
  kpiDefinitionId: string | null,
  scope: { facilityId: string | null; departmentId: string | null; serviceLineId: string | null },
  targetValue: number | null,
  benchmarkValue: number | null
): TableInsert<"metric_values"> {
  const valueNumeric = typeof input.valueNumeric === "number" ? input.valueNumeric : null;

  return {
    organization_id: organizationId,
    metric_id: metricId,
    kpi_definition_id: kpiDefinitionId,
    facility_id: scope.facilityId,
    department_id: scope.departmentId,
    service_line_id: scope.serviceLineId,
    ingestion_job_id: input.ingestionJobId?.trim() || null,
    period_start: normalizeOptionalDate(input.periodStart),
    period_end: normalizeOptionalDate(input.periodEnd),
    as_of_date: input.asOfDate,
    value_numeric: valueNumeric,
    value_text: normalizeOptionalText(input.valueText),
    value_json: parseOptionalJson(input.valueJson),
    target_value: targetValue,
    benchmark_value: benchmarkValue,
    variance_value: computeVariance(valueNumeric, targetValue, benchmarkValue),
    status: input.status ?? "published",
    lineage: parseLineage(input.lineage),
  };
}

export async function listAnalyticsScopeCatalog(limit = 50): Promise<AnalyticsScopeCatalog> {
  const { organizationId, organization } = await requireMetricReadContext();
  const client = await getSupabaseServerClient();
  const [facilities, departments, serviceLines] = await Promise.all([
    organizationRepository.listFacilities(client, organizationId, limit),
    organizationRepository.listDepartments(client, organizationId, limit),
    organizationRepository.listServiceLines(client, organizationId, limit),
  ]);

  return {
    organization,
    facilities,
    departments,
    serviceLines,
  };
}

export async function publishMetricValue(input: MetricValuePublishInput) {
  const currentUser = await requireAdminAccess();
  const organizationId = currentUser.profile?.organization_id;

  if (!organizationId) {
    throw new ForbiddenError("An organization context is required to publish metric values.");
  }

  assertAtLeastOneMetricValue(input);
  const metric = await resolveMetric(input.metricId, organizationId);
  const scope = await resolveScope(input, organizationId);
  const adminClient = getSupabaseAdminClient();
  const [benchmarks, targets] = await Promise.all([
    benchmarkRepository.listBenchmarksByMetricIds(adminClient, organizationId, [metric.id]),
    targetRepository.listTargetsByMetricIds(adminClient, organizationId, [metric.id]),
  ]);

  const target = selectApplicableTarget(targets, {
    metric_id: metric.id,
    kpi_definition_id: metric.kpi_definition_id,
    facility_id: scope.facilityId,
    department_id: scope.departmentId,
    service_line_id: scope.serviceLineId,
    as_of_date: input.asOfDate,
  });
  const benchmark = selectApplicableBenchmark(benchmarks, {
    metric_id: metric.id,
    kpi_definition_id: metric.kpi_definition_id,
    as_of_date: input.asOfDate,
  });

  if ((input.status ?? "published") === "published") {
    await metricValueRepository.updateMetricValuesByIdentity(
      adminClient,
      {
        organizationId,
        metricId: metric.id,
        asOfDate: input.asOfDate,
        facilityId: scope.facilityId,
        departmentId: scope.departmentId,
        serviceLineId: scope.serviceLineId,
      },
      { status: "superseded" }
    );
  }

  const metricValue = await metricValueRepository.createMetricValue(
    adminClient,
    mapMetricValueInsert(input, organizationId, metric.id, metric.kpi_definition_id, scope, target?.target_value ?? null, benchmark?.value_numeric ?? null)
  );

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "metric_value.published",
    entityType: "metric_value",
    entityId: metricValue.id,
    scopeLevel: scope.departmentId ? "department" : scope.serviceLineId ? "service_line" : scope.facilityId ? "facility" : "organization",
    facilityId: scope.facilityId,
    departmentId: scope.departmentId,
    metadata: {
      metric_id: metricValue.metric_id,
      status: metricValue.status,
      target_value: metricValue.target_value,
      benchmark_value: metricValue.benchmark_value,
    },
  });

  return metricValue;
}

export async function listMetricValueCatalog(filters: MetricValueQueryInput = {}): Promise<MetricValueCatalog> {
  const { currentUser, organizationId, organization } = await requireMetricReadContext();
  const client = await getSupabaseServerClient();
  const [values, metrics, kpis, benchmarks, targets] = await Promise.all([
    metricValueRepository.listMetricValues(client, organizationId, filters.limit ?? 50),
    metricRepository.listMetrics(client, organizationId, filters.limit ?? 100),
    kpiRepository.listKpiDefinitions(client, organizationId, filters.limit ?? 100),
    benchmarkRepository.listBenchmarks(client, organizationId, filters.limit ?? 100),
    targetRepository.listTargets(client, organizationId, filters.limit ?? 100),
  ]);

  const filtered = filterMetricValuesForScope(values, {
    facilityId: filters.facilityId,
    departmentId: filters.departmentId,
    serviceLineId: filters.serviceLineId,
    status: filters.status ?? "all",
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  });

  return {
    organization,
    canManage: currentUser.canManageAdministration,
    values: filtered.map((metricValue) => {
      const metric = metrics.find((entry) => entry.id === metricValue.metric_id) ?? null;
      const kpiDefinition = kpis.find((entry) => entry.id === metricValue.kpi_definition_id) ?? null;
      const target = selectApplicableTarget(targets, metricValue);
      const benchmark = selectApplicableBenchmark(benchmarks, metricValue);
      const aggregationGrain = kpiDefinition?.aggregation_grain ?? null;

      return {
        metricValue: {
          ...metricValue,
          target_value: metricValue.target_value ?? target?.target_value ?? null,
          benchmark_value: metricValue.benchmark_value ?? benchmark?.value_numeric ?? null,
          variance_value: metricValue.variance_value ?? computeVariance(metricValue.value_numeric, target?.target_value ?? null, benchmark?.value_numeric ?? null),
        },
        metric,
        kpiDefinition,
        target,
        benchmark,
        freshness: computeMetricFreshnessStatus(metricValue.as_of_date, aggregationGrain),
      };
    }),
  };
}
