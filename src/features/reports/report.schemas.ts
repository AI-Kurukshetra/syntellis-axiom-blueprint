import { z } from "@/lib/validation";

const optionalText = z.string().trim().max(240).optional().or(z.literal(""));
const optionalSlug = z.string().trim().max(80).optional().or(z.literal(""));
const optionalUuid = z.string().uuid().optional().or(z.literal(""));
const optionalDate = z.string().trim().max(20).optional().or(z.literal(""));
const reportColumnSchema = z.enum([
  "metricName",
  "metricCode",
  "domain",
  "asOfDate",
  "value",
  "targetValue",
  "benchmarkValue",
  "varianceValue",
  "status",
  "facilityName",
  "departmentName",
  "serviceLineName",
  "freshness",
]);

export const reportQuerySchema = z.object({
  reportSlug: optionalSlug,
});

export const reportSchema = z.object({
  name: z.string().trim().min(2, "Report name is required.").max(120, "Report name is too long."),
  slug: optionalSlug,
  description: optionalText,
  visibility: z.enum(["private", "shared", "role_based"]).default("shared"),
  domain: z.string().trim().min(2, "Domain is required.").max(80, "Domain is too long."),
  metricIds: z.array(z.string().uuid()).min(1, "Select at least one metric for the report."),
  facilityId: optionalUuid,
  departmentId: optionalUuid,
  serviceLineId: optionalUuid,
  dateFrom: optionalDate,
  dateTo: optionalDate,
  status: z.enum(["draft", "published", "superseded", "all"]).default("published"),
  columns: z.array(reportColumnSchema).min(4, "Select at least four columns for the report."),
});

export const reportUpdateSchema = reportSchema.extend({
  reportId: z.string().uuid("A valid report id is required."),
});

export const reportRemovalSchema = z.object({
  reportId: z.string().uuid("A valid report id is required."),
});

export const reportRunSchema = z.object({
  reportId: z.string().uuid("A valid report id is required."),
  format: z.enum(["csv", "pdf", "xlsx"]).default("csv"),
});

export const reportScheduleSchema = z.object({
  reportId: z.string().uuid("A valid report id is required."),
  frequency: z.enum(["once", "hourly", "daily", "weekly", "monthly", "quarterly"]).default("weekly"),
  format: z.enum(["csv", "pdf", "xlsx"]).default("csv"),
  recipientUserIds: z.array(z.string().uuid()).min(1, "Select at least one recipient."),
  deliveryChannels: z.array(z.enum(["in_app", "email", "sms", "webhook"])) .min(1).default(["email"]),
  cronExpression: optionalText,
  isActive: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((value) => value === true || value === "on" || value === "true"),
});

export const reportScheduleRemovalSchema = z.object({
  scheduleId: z.string().uuid("A valid schedule id is required."),
});
