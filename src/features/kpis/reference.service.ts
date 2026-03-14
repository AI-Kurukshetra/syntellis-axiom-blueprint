import type { BenchmarkCatalog, BenchmarkInput, Json, TargetCatalog, TargetInput, TableInsert } from "@/types";

import { safeLogAuditEvent } from "@/lib/audit";
import { canAccessModule, requireAdminAccess } from "@/lib/auth/authorization";
import { requireCurrentUserContext } from "@/lib/auth/current-user";
import { ForbiddenError, NotFoundError } from "@/lib/http-errors";
import { benchmarkRepository } from "@/lib/repositories/benchmark.repository";
import { kpiRepository } from "@/lib/repositories/kpi.repository";
import { metricRepository } from "@/lib/repositories/metric.repository";
import { organizationRepository } from "@/lib/repositories/organization.repository";
import { targetRepository } from "@/lib/repositories/target.repository";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

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
    const parsed = JSON.parse(normalized) as Json;
    return parsed;
  } catch {
    throw new Error("Enter valid JSON.");
  }
}

async function requireReferenceReadContext() {
  const currentUser = await requireCurrentUserContext();
  const organizationId = currentUser.profile?.organization_id;

  if (!organizationId || !currentUser.organization) {
    throw new ForbiddenError("An organization context is required to work with analytics references.");
  }

  if (!canAccessModule(currentUser, "analytics") && !currentUser.canManageAdministration) {
    throw new ForbiddenError("Analytics access is required to view targets and benchmarks.");
  }

  return {
    currentUser,
    organizationId,
    organization: currentUser.organization,
  };
}

async function resolveMetricAndKpi(metricId: string | undefined, kpiDefinitionId: string | undefined, organizationId: string) {
  const adminClient = getSupabaseAdminClient();
  let resolvedMetricId: string | null = null;
  let resolvedKpiDefinitionId: string | null = null;

  if (metricId) {
    const metric = await metricRepository.getMetricById(adminClient, metricId);

    if (!metric || metric.organization_id !== organizationId) {
      throw new NotFoundError("The selected metric does not exist in the current organization.");
    }

    resolvedMetricId = metric.id;
    resolvedKpiDefinitionId = metric.kpi_definition_id;
  }

  if (kpiDefinitionId) {
    const definition = await kpiRepository.getKpiDefinitionById(adminClient, kpiDefinitionId);

    if (!definition || definition.organization_id !== organizationId) {
      throw new NotFoundError("The selected KPI definition does not exist in the current organization.");
    }

    resolvedKpiDefinitionId = definition.id;
  }

  return {
    metricId: resolvedMetricId,
    kpiDefinitionId: resolvedKpiDefinitionId,
  };
}

async function resolveScope(input: TargetInput, organizationId: string) {
  const adminClient = getSupabaseAdminClient();
  const facilityId = input.facilityId?.trim() || null;
  const departmentId = input.departmentId?.trim() || null;
  const serviceLineId = input.serviceLineId?.trim() || null;

  if (facilityId) {
    const facility = await organizationRepository.getFacilityById(adminClient, facilityId);
    if (!facility || facility.organization_id != organizationId) {
      throw new NotFoundError("The selected facility does not exist in the current organization.");
    }
  }

  if (departmentId) {
    const department = await organizationRepository.getDepartmentById(adminClient, departmentId);
    if (!department || department.organization_id != organizationId) {
      throw new NotFoundError("The selected department does not exist in the current organization.");
    }
  }

  if (serviceLineId) {
    const serviceLine = await organizationRepository.getServiceLineById(adminClient, serviceLineId);
    if (!serviceLine || serviceLine.organization_id != organizationId) {
      throw new NotFoundError("The selected service line does not exist in the current organization.");
    }
  }

  return { facilityId, departmentId, serviceLineId };
}

export async function listBenchmarkCatalog(limit = 50): Promise<BenchmarkCatalog> {
  const { currentUser, organizationId, organization } = await requireReferenceReadContext();
  const client = await getSupabaseServerClient();
  const benchmarks = await benchmarkRepository.listBenchmarks(client, organizationId, limit);

  return {
    organization,
    canManage: currentUser.canManageAdministration,
    benchmarks,
  };
}

export async function listTargetCatalog(limit = 50): Promise<TargetCatalog> {
  const { currentUser, organizationId, organization } = await requireReferenceReadContext();
  const client = await getSupabaseServerClient();
  const targets = await targetRepository.listTargets(client, organizationId, limit);

  return {
    organization,
    canManage: currentUser.canManageAdministration,
    targets,
  };
}

export async function createBenchmark(input: BenchmarkInput) {
  const currentUser = await requireAdminAccess();
  const organizationId = currentUser.profile?.organization_id;

  if (!organizationId) {
    throw new ForbiddenError("An organization context is required to create benchmarks.");
  }

  const references = await resolveMetricAndKpi(input.metricId, input.kpiDefinitionId, organizationId);
  const adminClient = getSupabaseAdminClient();
  const benchmark = await benchmarkRepository.createBenchmark(adminClient, {
    organization_id: organizationId,
    metric_id: references.metricId,
    kpi_definition_id: references.kpiDefinitionId,
    name: input.name.trim(),
    source_type: input.sourceType ?? "internal",
    domain: input.domain.trim(),
    comparison_method: normalizeOptionalText(input.comparisonMethod),
    value_numeric: typeof input.valueNumeric === "number" ? input.valueNumeric : null,
    value_json: parseOptionalJson(input.valueJson),
    source_reference: normalizeOptionalText(input.sourceReference),
    benchmark_start: normalizeOptionalDate(input.benchmarkStart),
    benchmark_end: normalizeOptionalDate(input.benchmarkEnd),
    version: input.version ?? 1,
  });

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "benchmark.created",
    entityType: "benchmark",
    entityId: benchmark.id,
    scopeLevel: "organization",
    metadata: {
      name: benchmark.name,
      metric_id: benchmark.metric_id,
      kpi_definition_id: benchmark.kpi_definition_id,
      version: benchmark.version,
    },
  });

  return benchmark;
}

export async function updateBenchmark(benchmarkId: string, input: BenchmarkInput) {
  const currentUser = await requireAdminAccess();
  const organizationId = currentUser.profile?.organization_id;

  if (!organizationId) {
    throw new ForbiddenError("An organization context is required to update benchmarks.");
  }

  const adminClient = getSupabaseAdminClient();
  const existing = await benchmarkRepository.getBenchmarkById(adminClient, benchmarkId);

  if (!existing || existing.organization_id !== organizationId) {
    throw new NotFoundError("The selected benchmark does not exist in the current organization.");
  }

  const references = await resolveMetricAndKpi(input.metricId, input.kpiDefinitionId, organizationId);
  const benchmark = await benchmarkRepository.updateBenchmark(adminClient, benchmarkId, {
    metric_id: references.metricId,
    kpi_definition_id: references.kpiDefinitionId,
    name: input.name.trim(),
    source_type: input.sourceType ?? existing.source_type,
    domain: input.domain.trim(),
    comparison_method: normalizeOptionalText(input.comparisonMethod),
    value_numeric: typeof input.valueNumeric === "number" ? input.valueNumeric : null,
    value_json: parseOptionalJson(input.valueJson),
    source_reference: normalizeOptionalText(input.sourceReference),
    benchmark_start: normalizeOptionalDate(input.benchmarkStart),
    benchmark_end: normalizeOptionalDate(input.benchmarkEnd),
    version: input.version ?? existing.version,
  });

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "benchmark.updated",
    entityType: "benchmark",
    entityId: benchmark.id,
    scopeLevel: "organization",
    metadata: {
      name: benchmark.name,
      metric_id: benchmark.metric_id,
      version: benchmark.version,
    },
  });

  return benchmark;
}

export async function deleteBenchmark(benchmarkId: string) {
  const currentUser = await requireAdminAccess();
  const organizationId = currentUser.profile?.organization_id;

  if (!organizationId) {
    throw new ForbiddenError("An organization context is required to delete benchmarks.");
  }

  const adminClient = getSupabaseAdminClient();
  const existing = await benchmarkRepository.getBenchmarkById(adminClient, benchmarkId);

  if (!existing || existing.organization_id !== organizationId) {
    throw new NotFoundError("The selected benchmark does not exist in the current organization.");
  }

  const benchmark = await benchmarkRepository.deleteBenchmark(adminClient, benchmarkId);

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "benchmark.deleted",
    entityType: "benchmark",
    entityId: benchmark.id,
    scopeLevel: "organization",
    metadata: {
      name: existing.name,
      metric_id: existing.metric_id,
    },
  });

  return benchmark;
}

export async function createTarget(input: TargetInput) {
  const currentUser = await requireAdminAccess();
  const organizationId = currentUser.profile?.organization_id;

  if (!organizationId) {
    throw new ForbiddenError("An organization context is required to create targets.");
  }

  const references = await resolveMetricAndKpi(input.metricId, input.kpiDefinitionId, organizationId);
  const scope = await resolveScope(input, organizationId);
  const adminClient = getSupabaseAdminClient();
  const target = await targetRepository.createTarget(adminClient, {
    organization_id: organizationId,
    metric_id: references.metricId,
    kpi_definition_id: references.kpiDefinitionId,
    scope_level: input.scopeLevel ?? "organization",
    facility_id: scope.facilityId,
    department_id: scope.departmentId,
    service_line_id: scope.serviceLineId,
    owner_user_id: currentUser.authUser.id,
    period_start: input.periodStart,
    period_end: input.periodEnd,
    target_value: input.targetValue,
    tolerance_percent: typeof input.tolerancePercent === "number" ? input.tolerancePercent : null,
    notes: normalizeOptionalText(input.notes),
  });

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "target.created",
    entityType: "target",
    entityId: target.id,
    scopeLevel: target.scope_level,
    facilityId: target.facility_id,
    departmentId: target.department_id,
    metadata: {
      metric_id: target.metric_id,
      kpi_definition_id: target.kpi_definition_id,
      target_value: target.target_value,
    },
  });

  return target;
}

export async function updateTarget(targetId: string, input: TargetInput) {
  const currentUser = await requireAdminAccess();
  const organizationId = currentUser.profile?.organization_id;

  if (!organizationId) {
    throw new ForbiddenError("An organization context is required to update targets.");
  }

  const adminClient = getSupabaseAdminClient();
  const existing = await targetRepository.getTargetById(adminClient, targetId);

  if (!existing || existing.organization_id !== organizationId) {
    throw new NotFoundError("The selected target does not exist in the current organization.");
  }

  const references = await resolveMetricAndKpi(input.metricId, input.kpiDefinitionId, organizationId);
  const scope = await resolveScope(input, organizationId);
  const target = await targetRepository.updateTarget(adminClient, targetId, {
    metric_id: references.metricId,
    kpi_definition_id: references.kpiDefinitionId,
    scope_level: input.scopeLevel ?? existing.scope_level,
    facility_id: scope.facilityId,
    department_id: scope.departmentId,
    service_line_id: scope.serviceLineId,
    period_start: input.periodStart,
    period_end: input.periodEnd,
    target_value: input.targetValue,
    tolerance_percent: typeof input.tolerancePercent === "number" ? input.tolerancePercent : null,
    notes: normalizeOptionalText(input.notes),
  });

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "target.updated",
    entityType: "target",
    entityId: target.id,
    scopeLevel: target.scope_level,
    facilityId: target.facility_id,
    departmentId: target.department_id,
    metadata: {
      metric_id: target.metric_id,
      target_value: target.target_value,
    },
  });

  return target;
}

export async function deleteTarget(targetId: string) {
  const currentUser = await requireAdminAccess();
  const organizationId = currentUser.profile?.organization_id;

  if (!organizationId) {
    throw new ForbiddenError("An organization context is required to delete targets.");
  }

  const adminClient = getSupabaseAdminClient();
  const existing = await targetRepository.getTargetById(adminClient, targetId);

  if (!existing || existing.organization_id !== organizationId) {
    throw new NotFoundError("The selected target does not exist in the current organization.");
  }

  const target = await targetRepository.deleteTarget(adminClient, targetId);

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "target.deleted",
    entityType: "target",
    entityId: target.id,
    scopeLevel: target.scope_level,
    facilityId: target.facility_id,
    departmentId: target.department_id,
    metadata: {
      metric_id: existing.metric_id,
      target_value: existing.target_value,
    },
  });

  return target;
}
