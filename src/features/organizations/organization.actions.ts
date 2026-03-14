"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { organizationBootstrapSchema, organizationSettingsSchema } from "@/features/organizations/organization.schemas";
import { bootstrapOrganizationForCurrentUser, updateCurrentOrganizationSettings } from "@/features/organizations/organization.service";
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

export async function updateOrganizationSettingsAction(formData: FormData) {
  const result = await executeValidatedServerAction(organizationSettingsSchema, Object.fromEntries(formData.entries()), (input) =>
    updateCurrentOrganizationSettings(input)
  );

  if (!result.success) {
    redirect(`/admin?error=${encodeURIComponent(result.error.message)}`);
  }

  revalidatePath("/admin");
  redirect(`/admin?message=${encodeURIComponent(`Organization ${result.data.name} updated.`)}`);
}
