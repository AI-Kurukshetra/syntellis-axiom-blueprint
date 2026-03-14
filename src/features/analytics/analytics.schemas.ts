import { z } from "@/lib/validation";

const optionalUuid = z.string().uuid().optional().or(z.literal(""));
const optionalDate = z.string().trim().max(20).optional().or(z.literal(""));
const optionalText = z.string().trim().max(80).optional().or(z.literal(""));

export const analyticsQuerySchema = z.object({
  domainTab: z.enum(["financial", "operations", "clinical_quality", "revenue_cycle"]).default("financial"),
  facilityId: optionalUuid,
  departmentId: optionalUuid,
  serviceLineId: optionalUuid,
  dateFrom: optionalDate,
  dateTo: optionalDate,
  compareBy: z.enum(["organization", "facility", "department", "service_line"]).default("facility"),
  savedView: optionalText,
});
