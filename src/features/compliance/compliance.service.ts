import type { AuditLogCatalog, AuditLogQueryInput } from "@/types";

import { safeLogAuditEvent } from "@/lib/audit";
import { requireAdminAccess } from "@/lib/auth/authorization";
import { requireCurrentUserContext } from "@/lib/auth/current-user";
import { ForbiddenError } from "@/lib/http-errors";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { organizationRepository } from "@/lib/repositories/organization.repository";
import { profileRepository } from "@/lib/repositories/profile.repository";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const auditTemplates: AuditLogCatalog["templates"] = [
  {
    key: "sensitive-access",
    label: "Sensitive access",
    description: "Dashboard and report access activity.",
    filters: {
      entityType: "",
      action: "dashboard.viewed",
      page: 1,
      limit: 25,
    },
  },
  {
    key: "exports",
    label: "Exports",
    description: "Analytics and report export activity.",
    filters: {
      action: "analytics.exported",
      page: 1,
      limit: 25,
    },
  },
  {
    key: "auth",
    label: "Authentication",
    description: "Sign-in and session activity.",
    filters: {
      entityType: "session",
      page: 1,
      limit: 25,
    },
  },
];

function getResolvedFilters(filters: AuditLogQueryInput = {}): Required<AuditLogQueryInput> {
  return {
    limit: filters.limit ?? 50,
    page: filters.page ?? 1,
    actorUserId: filters.actorUserId?.trim() ?? "",
    action: filters.action?.trim() ?? "",
    entityType: filters.entityType?.trim() ?? "",
    facilityId: filters.facilityId?.trim() ?? "",
    dateFrom: filters.dateFrom?.trim() ?? "",
    dateTo: filters.dateTo?.trim() ?? "",
  };
}

export async function listAuditLogCatalog(filters: AuditLogQueryInput = {}): Promise<AuditLogCatalog> {
  const currentUser = await requireAdminAccess();
  const organizationId = currentUser.profile?.organization_id;

  if (!organizationId || !currentUser.organization) {
    throw new ForbiddenError("An organization context is required to review audit activity.");
  }

  const client = await getSupabaseServerClient();
  const resolvedFilters = getResolvedFilters(filters);
  const [logs, totalCount, users, facilities] = await Promise.all([
    auditRepository.listAuditLogs(client, organizationId, {
      limit: resolvedFilters.limit,
      page: resolvedFilters.page,
      actorUserId: resolvedFilters.actorUserId || null,
      action: resolvedFilters.action || null,
      entityType: resolvedFilters.entityType || null,
      facilityId: resolvedFilters.facilityId || null,
      dateFrom: resolvedFilters.dateFrom || null,
      dateTo: resolvedFilters.dateTo || null,
    }),
    auditRepository.countAuditLogs(client, organizationId, {
      actorUserId: resolvedFilters.actorUserId || null,
      action: resolvedFilters.action || null,
      entityType: resolvedFilters.entityType || null,
      facilityId: resolvedFilters.facilityId || null,
      dateFrom: resolvedFilters.dateFrom || null,
      dateTo: resolvedFilters.dateTo || null,
    }),
    profileRepository.listProfilesByOrganization(client, organizationId, 100),
    organizationRepository.listFacilities(client, organizationId, 100),
  ]);

  return {
    organization: currentUser.organization,
    canManage: currentUser.canManageAdministration,
    logs,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / resolvedFilters.limit)),
    users,
    facilities,
    actions: [...new Set(logs.map((log) => log.action))].sort(),
    entityTypes: [...new Set(logs.map((log) => log.entity_type))].sort(),
    templates: auditTemplates,
    filters: resolvedFilters,
  };
}

export async function logAuthSessionEvent(input: { eventType: "sign_in" | "session_resolved"; source: string }) {
  const currentUser = await requireCurrentUserContext();

  await safeLogAuditEvent({
    organizationId: currentUser.organization?.id ?? currentUser.profile?.organization_id ?? null,
    actorUserId: currentUser.authUser.id,
    action: input.eventType === "sign_in" ? "auth.sign_in" : "auth.session_resolved",
    entityType: "session",
    scopeLevel: currentUser.organization ? "organization" : "global",
    metadata: {
      source: input.source,
    },
  });

  return { recorded: true };
}
