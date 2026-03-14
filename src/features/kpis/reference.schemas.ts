import { z } from "@/lib/validation";

const optionalText = z.string().trim().max(4000).optional().or(z.literal(""));
const optionalUuid = z.string().uuid("Select a valid reference.").optional().or(z.literal(""));
const optionalDate = z.string().trim().max(20).optional().or(z.literal(""));
const optionalNumber = z.preprocess((value) => {
  if (value === "" || value === null || typeof value === "undefined") {
    return undefined;
  }

  return typeof value === "number" ? value : Number(value);
}, z.number().finite().optional());

export const benchmarkSchema = z.object({
  metricId: optionalUuid,
  kpiDefinitionId: optionalUuid,
  name: z.string().trim().min(2, "Benchmark name is required.").max(160, "Benchmark name is too long."),
  sourceType: z.enum(["internal", "external", "licensed", "customer_provided"]).default("internal"),
  domain: z.string().trim().min(2, "Domain is required.").max(80, "Domain is too long."),
  comparisonMethod: optionalText,
  valueNumeric: optionalNumber,
  valueJson: optionalText,
  sourceReference: optionalText,
  benchmarkStart: optionalDate,
  benchmarkEnd: optionalDate,
  version: z.coerce.number().int().min(1).max(999).default(1),
});

export const benchmarkUpdateSchema = benchmarkSchema.extend({
  benchmarkId: z.string().uuid("A valid benchmark id is required."),
});

export const benchmarkRemovalSchema = z.object({
  benchmarkId: z.string().uuid("A valid benchmark id is required."),
});

export const targetSchema = z.object({
  metricId: optionalUuid,
  kpiDefinitionId: optionalUuid,
  scopeLevel: z.enum(["organization", "facility", "department", "service_line"]).default("organization"),
  facilityId: optionalUuid,
  departmentId: optionalUuid,
  serviceLineId: optionalUuid,
  periodStart: z.string().trim().min(4, "Period start is required.").max(20, "Period start is too long."),
  periodEnd: z.string().trim().min(4, "Period end is required.").max(20, "Period end is too long."),
  targetValue: z.coerce.number().finite("Target value must be numeric."),
  tolerancePercent: optionalNumber,
  notes: optionalText,
});

export const targetUpdateSchema = targetSchema.extend({
  targetId: z.string().uuid("A valid target id is required."),
});

export const targetRemovalSchema = z.object({
  targetId: z.string().uuid("A valid target id is required."),
});
