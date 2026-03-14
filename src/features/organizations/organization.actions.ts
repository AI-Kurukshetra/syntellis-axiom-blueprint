"use server";

import { redirect } from "next/navigation";

import { organizationBootstrapSchema } from "@/features/organizations/organization.schemas";
import { bootstrapOrganizationForCurrentUser } from "@/features/organizations/organization.service";
import { executeValidatedServerAction } from "@/lib/server-action";

export async function bootstrapOrganizationAction(formData: FormData) {
  const result = await executeValidatedServerAction(organizationBootstrapSchema, Object.fromEntries(formData.entries()), (input) =>
    bootstrapOrganizationForCurrentUser(input)
  );

  if (!result.success) {
    redirect(`/onboarding?error=${encodeURIComponent(result.error.message)}`);
  }

  redirect(`/workspace?message=${encodeURIComponent(`Organization ${result.data.name} is ready.`)}`);
}
