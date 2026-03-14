import { z } from "@/lib/validation";

const optionalText = z.string().trim().max(160).optional().or(z.literal(""));

export const organizationBootstrapSchema = z.object({
  name: z.string().trim().min(2, "Organization name is required.").max(120, "Organization name is too long."),
  slug: z.string().trim().max(63, "Organization slug must be 63 characters or less.").optional().or(z.literal("")),
  legalName: optionalText,
  timezone: z.string().trim().min(3, "Timezone is required.").max(80, "Timezone is too long."),
  contactEmail: z.string().trim().email("Enter a valid contact email address.").optional().or(z.literal("")),
});
