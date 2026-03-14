import { z } from "@/lib/validation";

const optionalText = z.string().trim().max(160).optional().or(z.literal(""));
const optionalDate = z.string().trim().max(20).optional().or(z.literal(""));
const organizationStatusSchema = z.enum(["draft", "active", "inactive"]);
const optionalEmail = z.string().trim().email("Enter a valid email address.").optional().or(z.literal(""));
const optionalPositiveNumber = z.union([z.literal(""), z.coerce.number().int().min(1).max(3650)]).transform((value) =>
  value === "" ? undefined : value
);
const optionalHourNumber = z.union([z.literal(""), z.coerce.number().int().min(0).max(23)]).transform((value) =>
  value === "" ? undefined : value
);
const optionalRefreshMinutes = z.union([z.literal(""), z.coerce.number().int().min(5).max(1440)]).transform((value) =>
  value === "" ? undefined : value
);
const checkboxValue = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.boolean()])
  .optional()
  .transform((value) => value === true || value === "on" || value === "true");

export const organizationBootstrapSchema = z.object({
  name: z.string().trim().min(2, "Organization name is required.").max(120, "Organization name is too long."),
  slug: z.string().trim().max(63, "Organization slug must be 63 characters or less.").optional().or(z.literal("")),
  legalName: optionalText,
  timezone: z.string().trim().min(3, "Timezone is required.").max(80, "Timezone is too long."),
  contactEmail: z.string().trim().email("Enter a valid contact email address.").optional().or(z.literal("")),
});

export const organizationSettingsSchema = z.object({
  name: z.string().trim().min(2, "Organization name is required.").max(120, "Organization name is too long."),
  legalName: optionalText,
  timezone: z.string().trim().min(3, "Timezone is required.").max(80, "Timezone is too long."),
  contactEmail: optionalEmail,
  status: organizationStatusSchema.default("active"),
  effectiveFrom: optionalDate,
  effectiveTo: optionalDate,
  auditRetentionDays: optionalPositiveNumber,
  reportRetentionDays: optionalPositiveNumber,
  defaultNotificationEmail: optionalEmail,
  digestNotificationsEnabled: checkboxValue,
  alertEscalationEnabled: checkboxValue,
  dashboardRefreshIntervalMinutes: optionalRefreshMinutes,
  nightlySyncHourUtc: optionalHourNumber,
  reportScheduleHourUtc: optionalHourNumber,
});
