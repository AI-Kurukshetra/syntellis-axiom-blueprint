import type { Json, MetricCatalog, MetricInput, TableInsert } from "@/types";

import { safeLogAuditEvent } from "@/lib/audit";
import { canAccessModule, requireAdminAccess } from "@/lib/auth/authorization";
import { requireCurrentUserContext } from "@/lib/auth/current-user";
import { ForbiddenError, NotFoundError } from "@/lib/http-errors";
import { kpiRepository } from "@/lib/repositories/kpi.repository";
import { metricRepository } from "@/lib/repositories/metric.repository";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

function normalizeOptionalText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function parseDimensionsJson(value?: string | null) {
  const normalized = value?.trim();

  if (!normalized) {
    return {} satisfies Json;
  }

  try {
    const parsed = JSON.parse(normalized) as Json;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Metric dimensions JSON must be an object.");
    }

    return parsed;
  } catch {
    throw new Error("Enter valid JSON for dimensions schema.");
  }
}

async function requireMetricReadContext() {
  const currentUser = await requireCurrentUserContext();
  const organizationId = currentUser.profile?.organization_id;

  if (!organizationId || !currentUser.organization) {
    throw new ForbiddenError("An organization context is required to work with metrics.");
  }

  if (!canAccessModule(currentUser, "analytics") && !currentUser.canManageAdministration) {
    throw new ForbiddenError("Analytics access is required to view metrics.");
  }

  return {
    currentUser,
    organizationId,
    organization: currentUser.organization,
  };
}

async function requireManagedMetric(metricId: string, organizationId: string) {
  const adminClient = getSupabaseAdminClient();
  const metric = await metricRepository.getMetricById(adminClient, metricId);

  if (!metric || metric.organization_id !== organizationId) {
    throw new NotFoundError("The selected metric does not exist in the current organization.");
  }

  return metric;
}

async function resolveKpiDefinitionId(kpiDefinitionId: string | undefined, organizationId: string) {
  if (!kpiDefinitionId) {
    return null;
  }

  const adminClient = getSupabaseAdminClient();
  const definition = await kpiRepository.getKpiDefinitionById(adminClient, kpiDefinitionId);

  if (!definition || definition.organization_id !== organizationId) {
    throw new NotFoundError("The selected KPI definition does not exist in the current organization.");
  }

  return definition.id;
}

function mapMetricInsert(input: MetricInput, organizationId: string, kpiDefinitionId: string | null): TableInsert<"metrics"> {
  return {
    organization_id: organizationId,
    kpi_definition_id: kpiDefinitionId,
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
    domain: input.domain.trim(),
    description: normalizeOptionalText(input.description),
    metric_type: input.metricType.trim(),
    value_data_type: input.valueDataType.trim(),
    dimensions_schema: parseDimensionsJson(input.dimensionsSchema),
    is_active: input.isActive ?? true,
  };
}

export async function listMetricCatalog(limit = 50): Promise<MetricCatalog> {
  const { currentUser, organizationId, organization } = await requireMetricReadContext();
  const client = await getSupabaseServerClient();
  const [metrics, kpiDefinitions] = await Promise.all([
    metricRepository.listMetrics(client, organizationId, limit),
    kpiRepository.listKpiDefinitions(client, organizationId, limit),
  ]);

  return {
    organization,
    canManage: currentUser.canManageAdministration,
    metrics,
    kpiDefinitions,
  };
}

export async function createMetric(input: MetricInput) {
  const currentUser = await requireAdminAccess();
  const organizationId = currentUser.profile?.organization_id;

  if (!organizationId) {
    throw new ForbiddenError("An organization context is required to create metrics.");
  }

  const adminClient = getSupabaseAdminClient();
  const code = input.code.trim().toUpperCase();
  const existing = await metricRepository.getMetricByCode(adminClient, organizationId, code);

  if (existing) {
    throw new Error("A metric with this code already exists.");
  }

  const kpiDefinitionId = await resolveKpiDefinitionId(input.kpiDefinitionId, organizationId);
  const metric = await metricRepository.createMetric(adminClient, mapMetricInsert(input, organizationId, kpiDefinitionId));

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "metric.created",
    entityType: "metric",
    entityId: metric.id,
    scopeLevel: "organization",
    metadata: {
      code: metric.code,
      metric_type: metric.metric_type,
      value_data_type: metric.value_data_type,
      kpi_definition_id: metric.kpi_definition_id,
    },
  });

  return metric;
}

export async function updateMetric(metricId: string, input: MetricInput) {
  const currentUser = await requireAdminAccess();
  const organizationId = currentUser.profile?.organization_id;

  if (!organizationId) {
    throw new ForbiddenError("An organization context is required to update metrics.");
  }

  const adminClient = getSupabaseAdminClient();
  const existing = await requireManagedMetric(metricId, organizationId);
  const nextCode = input.code.trim().toUpperCase();

  if (nextCode !== existing.code) {
    const duplicate = await metricRepository.getMetricByCode(adminClient, organizationId, nextCode);

    if (duplicate && duplicate.id !== existing.id) {
      throw new Error("A metric with this code already exists.");
    }
  }

  const kpiDefinitionId = await resolveKpiDefinitionId(input.kpiDefinitionId, organizationId);
  const metric = await metricRepository.updateMetric(adminClient, metricId, {
    kpi_definition_id: kpiDefinitionId,
    code: nextCode,
    name: input.name.trim(),
    domain: input.domain.trim(),
    description: normalizeOptionalText(input.description),
    metric_type: input.metricType.trim(),
    value_data_type: input.valueDataType.trim(),
    dimensions_schema: parseDimensionsJson(input.dimensionsSchema),
    is_active: input.isActive ?? true,
  });

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "metric.updated",
    entityType: "metric",
    entityId: metric.id,
    scopeLevel: "organization",
    metadata: {
      code: metric.code,
      metric_type: metric.metric_type,
      value_data_type: metric.value_data_type,
      kpi_definition_id: metric.kpi_definition_id,
    },
  });

  return metric;
}

export async function deleteMetric(metricId: string) {
  const currentUser = await requireAdminAccess();
  const organizationId = currentUser.profile?.organization_id;

  if (!organizationId) {
    throw new ForbiddenError("An organization context is required to delete metrics.");
  }

  const adminClient = getSupabaseAdminClient();
  const existing = await requireManagedMetric(metricId, organizationId);
  const metric = await metricRepository.deleteMetric(adminClient, metricId);

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "metric.deleted",
    entityType: "metric",
    entityId: metric.id,
    scopeLevel: "organization",
    metadata: {
      code: existing.code,
      metric_type: existing.metric_type,
    },
  });

  return metric;
}
