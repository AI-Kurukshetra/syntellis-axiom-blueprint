import { z } from "@/lib/validation";

const optionalText = z.string().trim().max(120).optional().or(z.literal(""));
const optionalUuid = z.string().uuid().optional().or(z.literal(""));
const optionalDate = z.string().trim().max(20).optional().or(z.literal(""));

export const auditLogQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  page: z.coerce.number().int().min(1).max(9999).default(1),
  actorUserId: optionalUuid,
  action: optionalText,
  entityType: optionalText,
  facilityId: optionalUuid,
  dateFrom: optionalDate,
  dateTo: optionalDate,
});

export const authSessionAuditSchema = z.object({
  eventType: z.enum(["sign_in", "session_resolved"]).default("session_resolved"),
  source: z.string().trim().max(60).default("app"),
});
