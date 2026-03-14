import { z } from "@/lib/validation";

const optionalText = z.string().trim().max(4000).optional().or(z.literal(""));
const optionalDate = z.string().trim().max(20).optional().or(z.literal(""));
const booleanish = z.union([z.boolean(), z.literal("true"), z.literal("false"), z.literal("on")]).transform((value) => {
  if (typeof value === "boolean") {
    return value;
  }

  return value === "true" || value === "on";
});

export const kpisQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const kpiDefinitionSchema = z.object({
  code: z.string().trim().min(1, "KPI code is required.").max(64, "KPI code is too long."),
  name: z.string().trim().min(2, "KPI name is required.").max(160, "KPI name is too long."),
  domain: z.string().trim().min(2, "Domain is required.").max(80, "Domain is too long."),
  description: optionalText,
  formulaExpression: z.string().trim().min(2, "Formula is required.").max(4000, "Formula is too long."),
  numeratorLabel: optionalText,
  denominatorLabel: optionalText,
  unitOfMeasure: optionalText,
  aggregationGrain: optionalText,
  benchmarkDefinition: optionalText,
  targetDefinition: optionalText,
  version: z.coerce.number().int().min(1).max(999).default(1),
  effectiveFrom: optionalDate,
  effectiveTo: optionalDate,
  isActive: booleanish.default(true),
});

export const kpiDefinitionUpdateSchema = kpiDefinitionSchema.extend({
  kpiId: z.string().uuid("A valid KPI id is required."),
});

export const kpiDefinitionRemovalSchema = z.object({
  kpiId: z.string().uuid("A valid KPI id is required."),
});
