import type { CurrentUserContext, Json, KpiCatalog, KpiDefinitionInput, TableInsert } from "@/types";

import { safeLogAuditEvent } from "@/lib/audit";
import { canAccessModule, requireAdminAccess } from "@/lib/auth/authorization";
import { requireCurrentUserContext } from "@/lib/auth/current-user";
import { ForbiddenError, NotFoundError } from "@/lib/http-errors";
import { kpiRepository } from "@/lib/repositories/kpi.repository";
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

function parseDefinitionJson(value?: string | null) {
  const normalized = value?.trim();

  if (!normalized) {
    return {} satisfies Json;
  }

  try {
    const parsed = JSON.parse(normalized) as Json;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("KPI configuration JSON must be an object.");
    }

    return parsed;
  } catch {
    throw new Error("Enter valid JSON for benchmark and target definitions.");
  }
}

async function requireKpiReadContext() {
  const currentUser = await requireCurrentUserContext();
  const organizationId = currentUser.profile?.organization_id;

  if (!organizationId || !currentUser.organization) {
    throw new ForbiddenError("An organization context is required to work with KPI definitions.");
  }

  if (!canAccessModule(currentUser, "analytics") && !currentUser.canManageAdministration) {
    throw new ForbiddenError("Analytics access is required to view KPI definitions.");
  }

  return {
    currentUser,
    organizationId,
    organization: currentUser.organization,
  };
}

async function requireManagedKpi(kpiId: string, organizationId: string) {
  const adminClient = getSupabaseAdminClient();
  const definition = await kpiRepository.getKpiDefinitionById(adminClient, kpiId);

  if (!definition || definition.organization_id !== organizationId) {
    throw new NotFoundError("The selected KPI definition does not exist in the current organization.");
  }

  return definition;
}

function mapKpiInsert(input: KpiDefinitionInput, organizationId: string, userId: string): TableInsert<"kpi_definitions"> {
  return {
    organization_id: organizationId,
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
    domain: input.domain.trim(),
    description: normalizeOptionalText(input.description),
    formula_expression: input.formulaExpression.trim(),
    numerator_label: normalizeOptionalText(input.numeratorLabel),
    denominator_label: normalizeOptionalText(input.denominatorLabel),
    unit_of_measure: normalizeOptionalText(input.unitOfMeasure),
    aggregation_grain: normalizeOptionalText(input.aggregationGrain),
    benchmark_definition: parseDefinitionJson(input.benchmarkDefinition),
    target_definition: parseDefinitionJson(input.targetDefinition),
    version: input.version ?? 1,
    effective_from: normalizeOptionalDate(input.effectiveFrom),
    effective_to: normalizeOptionalDate(input.effectiveTo),
    is_active: input.isActive ?? true,
    created_by: userId,
  };
}

function assertKpiManageAccess(context: CurrentUserContext) {
  if (!context.canManageAdministration) {
    throw new ForbiddenError("Administrative access is required to manage KPI definitions.");
  }
}

export async function listKpiCatalog(limit = 50): Promise<KpiCatalog> {
  const { currentUser, organizationId, organization } = await requireKpiReadContext();
  const client = await getSupabaseServerClient();
  const definitions = await kpiRepository.listKpiDefinitions(client, organizationId, limit);

  return {
    organization,
    canManage: currentUser.canManageAdministration,
    definitions,
  };
}

export async function createKpiDefinition(input: KpiDefinitionInput) {
  const currentUser = await requireAdminAccess();
  const organizationId = currentUser.profile?.organization_id;

  if (!organizationId) {
    throw new ForbiddenError("An organization context is required to create KPI definitions.");
  }

  const adminClient = getSupabaseAdminClient();
  const code = input.code.trim().toUpperCase();
  const version = input.version ?? 1;
  const existing = await kpiRepository.getKpiDefinitionByCode(adminClient, organizationId, code, version);

  if (existing) {
    throw new Error("A KPI definition with this code and version already exists.");
  }

  const definition = await kpiRepository.createKpiDefinition(adminClient, mapKpiInsert(input, organizationId, currentUser.authUser.id));

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "kpi_definition.created",
    entityType: "kpi_definition",
    entityId: definition.id,
    scopeLevel: "organization",
    metadata: {
      code: definition.code,
      version: definition.version,
      domain: definition.domain,
    },
  });

  return definition;
}

export async function updateKpiDefinition(kpiId: string, input: KpiDefinitionInput) {
  const currentUser = await requireAdminAccess();
  assertKpiManageAccess(currentUser);
  const organizationId = currentUser.profile?.organization_id;

  if (!organizationId) {
    throw new ForbiddenError("An organization context is required to update KPI definitions.");
  }

  const adminClient = getSupabaseAdminClient();
  const existing = await requireManagedKpi(kpiId, organizationId);
  const nextCode = input.code.trim().toUpperCase();
  const nextVersion = input.version ?? 1;

  if (nextCode !== existing.code || nextVersion !== existing.version) {
    const duplicate = await kpiRepository.getKpiDefinitionByCode(adminClient, organizationId, nextCode, nextVersion);

    if (duplicate && duplicate.id !== existing.id) {
      throw new Error("A KPI definition with this code and version already exists.");
    }
  }

  const definition = await kpiRepository.updateKpiDefinition(adminClient, kpiId, {
    code: nextCode,
    name: input.name.trim(),
    domain: input.domain.trim(),
    description: normalizeOptionalText(input.description),
    formula_expression: input.formulaExpression.trim(),
    numerator_label: normalizeOptionalText(input.numeratorLabel),
    denominator_label: normalizeOptionalText(input.denominatorLabel),
    unit_of_measure: normalizeOptionalText(input.unitOfMeasure),
    aggregation_grain: normalizeOptionalText(input.aggregationGrain),
    benchmark_definition: parseDefinitionJson(input.benchmarkDefinition),
    target_definition: parseDefinitionJson(input.targetDefinition),
    version: nextVersion,
    effective_from: normalizeOptionalDate(input.effectiveFrom),
    effective_to: normalizeOptionalDate(input.effectiveTo),
    is_active: input.isActive ?? true,
  });

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "kpi_definition.updated",
    entityType: "kpi_definition",
    entityId: definition.id,
    scopeLevel: "organization",
    metadata: {
      code: definition.code,
      version: definition.version,
      domain: definition.domain,
    },
  });

  return definition;
}

export async function deleteKpiDefinition(kpiId: string) {
  const currentUser = await requireAdminAccess();
  assertKpiManageAccess(currentUser);
  const organizationId = currentUser.profile?.organization_id;

  if (!organizationId) {
    throw new ForbiddenError("An organization context is required to delete KPI definitions.");
  }

  const adminClient = getSupabaseAdminClient();
  const existing = await requireManagedKpi(kpiId, organizationId);
  const definition = await kpiRepository.deleteKpiDefinition(adminClient, kpiId);

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "kpi_definition.deleted",
    entityType: "kpi_definition",
    entityId: definition.id,
    scopeLevel: "organization",
    metadata: {
      code: existing.code,
      version: existing.version,
      domain: existing.domain,
    },
  });

  return definition;
}

export async function createKpiDefinitionVersion(kpiId: string) {
  const currentUser = await requireAdminAccess();
  const organizationId = currentUser.profile?.organization_id;

  if (!organizationId) {
    throw new ForbiddenError("An organization context is required to version KPI definitions.");
  }

  const adminClient = getSupabaseAdminClient();
  const source = await requireManagedKpi(kpiId, organizationId);
  const nextVersion = source.version + 1;
  const duplicate = await kpiRepository.getKpiDefinitionByCode(adminClient, organizationId, source.code, nextVersion);

  if (duplicate) {
    throw new Error("The next KPI version already exists.");
  }

  const version = await kpiRepository.createKpiDefinition(adminClient, {
    organization_id: organizationId,
    code: source.code,
    name: source.name,
    domain: source.domain,
    description: source.description,
    formula_expression: source.formula_expression,
    numerator_label: source.numerator_label,
    denominator_label: source.denominator_label,
    unit_of_measure: source.unit_of_measure,
    aggregation_grain: source.aggregation_grain,
    benchmark_definition: source.benchmark_definition,
    target_definition: source.target_definition,
    version: nextVersion,
    effective_from: source.effective_from,
    effective_to: source.effective_to,
    is_active: false,
    created_by: currentUser.authUser.id,
  });

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "kpi_definition.version_created",
    entityType: "kpi_definition",
    entityId: version.id,
    scopeLevel: "organization",
    metadata: {
      code: version.code,
      source_kpi_id: source.id,
      source_version: source.version,
      version: version.version,
    },
  });

  return {
    source,
    version,
  };
}
