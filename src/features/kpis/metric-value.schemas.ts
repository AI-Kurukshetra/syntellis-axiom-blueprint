import { z } from "@/lib/validation";

const optionalText = z.string().trim().max(4000).optional().or(z.literal(""));
const optionalUuid = z.string().uuid("Select a valid identifier.").optional().or(z.literal(""));
const optionalDate = z.string().trim().max(20).optional().or(z.literal(""));
const optionalNumber = z.preprocess((value) => {
  if (value === "" || value === null || typeof value === "undefined") {
    return undefined;
  }

  return typeof value === "number" ? value : Number(value);
}, z.number().finite().optional());

export const metricValuePublishSchema = z.object({
  metricId: z.string().uuid("Select a valid metric."),
  facilityId: optionalUuid,
  departmentId: optionalUuid,
  serviceLineId: optionalUuid,
  ingestionJobId: optionalUuid,
  periodStart: optionalDate,
  periodEnd: optionalDate,
  asOfDate: z.string().trim().min(4, "As-of date is required.").max(20, "As-of date is too long."),
  valueNumeric: optionalNumber,
  valueText: optionalText,
  valueJson: optionalText,
  status: z.enum(["draft", "published", "superseded"]).default("published"),
  lineage: optionalText,
});

export const metricValueQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  facilityId: optionalUuid,
  departmentId: optionalUuid,
  serviceLineId: optionalUuid,
  status: z.enum(["draft", "published", "superseded", "all"]).default("all"),
  dateFrom: optionalDate,
  dateTo: optionalDate,
});
