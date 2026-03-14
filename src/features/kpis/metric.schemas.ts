import { z } from "@/lib/validation";

const optionalText = z.string().trim().max(4000).optional().or(z.literal(""));
const optionalUuid = z.string().uuid("Select a valid KPI definition.").optional().or(z.literal(""));
const booleanish = z.union([z.boolean(), z.literal("true"), z.literal("false"), z.literal("on")]).transform((value) => {
  if (typeof value === "boolean") {
    return value;
  }

  return value === "true" || value === "on";
});

export const metricsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const metricSchema = z.object({
  kpiDefinitionId: optionalUuid,
  code: z.string().trim().min(1, "Metric code is required.").max(64, "Metric code is too long."),
  name: z.string().trim().min(2, "Metric name is required.").max(160, "Metric name is too long."),
  domain: z.string().trim().min(2, "Domain is required.").max(80, "Domain is too long."),
  description: optionalText,
  metricType: z.string().trim().min(2, "Metric type is required.").max(80, "Metric type is too long."),
  valueDataType: z.string().trim().min(2, "Value data type is required.").max(40, "Value data type is too long."),
  dimensionsSchema: optionalText,
  isActive: booleanish.default(true),
});

export const metricUpdateSchema = metricSchema.extend({
  metricId: z.string().uuid("A valid metric id is required."),
});

export const metricRemovalSchema = z.object({
  metricId: z.string().uuid("A valid metric id is required."),
});
