import { z } from "@/lib/validation";

const optionalText = z.string().trim().max(160).optional().or(z.literal(""));
const optionalDate = z.string().trim().max(20).optional().or(z.literal(""));
const optionalUuid = z.string().uuid().optional().or(z.literal(""));

export const facilityStatusSchema = z.enum(["draft", "active", "inactive"]);

export const facilitiesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const facilitySchema = z.object({
  serviceLineId: optionalUuid,
  code: z.string().trim().min(1, "Facility code is required.").max(32, "Facility code is too long."),
  name: z.string().trim().min(2, "Facility name is required.").max(120, "Facility name is too long."),
  facilityType: optionalText,
  timezone: z.string().trim().min(3, "Timezone is required.").max(80, "Timezone is too long."),
  status: facilityStatusSchema.default("active"),
  addressLine1: optionalText,
  addressLine2: optionalText,
  city: optionalText,
  stateRegion: optionalText,
  postalCode: optionalText,
  countryCode: z.string().trim().max(2, "Country code must be 2 characters or less.").optional().or(z.literal("")),
  effectiveFrom: optionalDate,
  effectiveTo: optionalDate,
});

export const facilityUpdateSchema = facilitySchema.partial();

export const departmentsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  facilityId: z.string().uuid().optional(),
});

export const departmentSchema = z.object({
  facilityId: z.string().uuid("Select a valid facility."),
  serviceLineId: optionalUuid,
  code: z.string().trim().min(1, "Department code is required.").max(32, "Department code is too long."),
  name: z.string().trim().min(2, "Department name is required.").max(120, "Department name is too long."),
  description: optionalText,
  status: facilityStatusSchema.default("active"),
  parentDepartmentId: optionalUuid,
  effectiveFrom: optionalDate,
  effectiveTo: optionalDate,
});

export const departmentUpdateSchema = departmentSchema.partial();

export const serviceLinesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  facilityId: z.string().uuid().optional(),
});

export const serviceLineSchema = z.object({
  facilityId: optionalUuid,
  code: z.string().trim().min(1, "Service line code is required.").max(32, "Service line code is too long."),
  name: z.string().trim().min(2, "Service line name is required.").max(120, "Service line name is too long."),
  description: optionalText,
  status: facilityStatusSchema.default("active"),
  effectiveFrom: optionalDate,
  effectiveTo: optionalDate,
});

export const serviceLineUpdateSchema = serviceLineSchema.partial();
