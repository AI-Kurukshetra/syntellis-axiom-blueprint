import type { Json, TableInsert } from "@/types";

import { RepositoryError } from "@/lib/repositories/base";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export type AuditEventInput = {
  organizationId?: string | null;
  actorUserId?: string | null;
  actorType?: TableInsert<"audit_logs">["actor_type"];
  action: string;
  entityType: string;
  entityId?: string | null;
  scopeLevel?: TableInsert<"audit_logs">["scope_level"];
  facilityId?: string | null;
  departmentId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  metadata?: Json;
};

function mapAuditEventToInsert(input: AuditEventInput): TableInsert<"audit_logs"> {
  return {
    organization_id: input.organizationId ?? null,
    actor_user_id: input.actorUserId ?? null,
    actor_type: input.actorType ?? "user",
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    scope_level: input.scopeLevel ?? "organization",
    facility_id: input.facilityId ?? null,
    department_id: input.departmentId ?? null,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
    request_id: input.requestId ?? null,
    metadata: input.metadata ?? {},
  };
}

export async function logAuditEvent(input: AuditEventInput) {
  const client = getSupabaseAdminClient();
  const { error } = await client.from("audit_logs").insert(mapAuditEventToInsert(input));

  if (error) {
    throw new RepositoryError("Failed to write audit log.", error);
  }
}

export async function safeLogAuditEvent(input: AuditEventInput) {
  try {
    await logAuditEvent(input);
    return true;
  } catch {
    return false;
  }
}
