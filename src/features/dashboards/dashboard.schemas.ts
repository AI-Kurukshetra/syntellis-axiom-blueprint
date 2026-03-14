import { z } from "@/lib/validation";

const optionalText = z.string().trim().max(160).optional().or(z.literal(""));
const optionalSlug = z.string().trim().max(80).optional().or(z.literal(""));
const optionalUuid = z.string().uuid().optional().or(z.literal(""));
const optionalDate = z.string().trim().max(20).optional().or(z.literal(""));

export const dashboardFiltersSchema = z.object({
  dashboardSlug: optionalSlug,
  facilityId: optionalUuid,
  departmentId: optionalUuid,
  serviceLineId: optionalUuid,
  dateFrom: optionalDate,
  dateTo: optionalDate,
  status: z.enum(["draft", "published", "superseded", "all"]).default("published"),
});

export const dashboardCreateSchema = z.object({
  name: z.string().trim().min(2, "Dashboard name is required.").max(120, "Dashboard name is too long."),
  slug: optionalSlug,
  description: z.string().trim().max(320, "Dashboard description is too long.").optional().or(z.literal("")),
  visibility: z.enum(["private", "shared", "role_based"]).default("shared"),
});

export const dashboardWidgetSchema = z.object({
  dashboardSlug: optionalSlug,
  metricId: z.string().uuid("Select a valid metric."),
  title: optionalText,
  widgetType: z.enum(["summary", "trend"]).default("summary"),
});

export const dashboardWidgetRemovalSchema = z.object({
  dashboardSlug: optionalSlug,
  widgetId: z.string().uuid("A valid widget id is required."),
});

