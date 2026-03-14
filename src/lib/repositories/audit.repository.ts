import type { PostgrestResponse } from "@supabase/supabase-js";

import type { AuditLog } from "@/types";

import type { AppSupabaseClient } from "@/lib/repositories/base";
import { unwrapCount, unwrapMany } from "@/lib/repositories/base";

type AuditLogFilters = {
  limit?: number;
  page?: number;
  actorUserId?: string | null;
  action?: string | null;
  entityType?: string | null;
  facilityId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
};

function applyAuditFilters(
  query: ReturnType<AppSupabaseClient["from"]>,
  organizationId: string,
  filters: AuditLogFilters
) {
  let nextQuery = query.eq("organization_id", organizationId);

  if (filters.actorUserId) {
    nextQuery = nextQuery.eq("actor_user_id", filters.actorUserId);
  }

  if (filters.action) {
    nextQuery = nextQuery.eq("action", filters.action);
  }

  if (filters.entityType) {
    nextQuery = nextQuery.eq("entity_type", filters.entityType);
  }

  if (filters.facilityId) {
    nextQuery = nextQuery.eq("facility_id", filters.facilityId);
  }

  if (filters.dateFrom) {
    nextQuery = nextQuery.gte("created_at", `${filters.dateFrom}T00:00:00.000Z`);
  }

  if (filters.dateTo) {
    nextQuery = nextQuery.lte("created_at", `${filters.dateTo}T23:59:59.999Z`);
  }

  return nextQuery;
}

export const auditRepository = {
  async listAuditLogs(
    client: AppSupabaseClient,
    organizationId: string,
    filters: AuditLogFilters
  ): Promise<AuditLog[]> {
    const limit = typeof filters.limit === "number" ? filters.limit : 50;
    const page = typeof filters.page === "number" ? filters.page : 1;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const query = applyAuditFilters(client.from("audit_logs").select("*"), organizationId, filters)
      .order("created_at", { ascending: false })
      .range(from, to);

    return unwrapMany<AuditLog>(await query as PostgrestResponse<AuditLog>, "Failed to list audit logs.");
  },

  async countAuditLogs(client: AppSupabaseClient, organizationId: string, filters: AuditLogFilters): Promise<number> {
    const query = applyAuditFilters(
      client.from("audit_logs").select("*", { count: "exact", head: true }),
      organizationId,
      filters
    );

    return unwrapCount(await query, "Failed to count audit logs.");
  },
};
