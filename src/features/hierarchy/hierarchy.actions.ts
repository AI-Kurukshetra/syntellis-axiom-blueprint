"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createDepartment, createFacility, deleteServiceLine, createServiceLine } from "@/features/hierarchy/hierarchy.service";
import { departmentSchema, facilitySchema, serviceLineSchema } from "@/features/hierarchy/hierarchy.schemas";
import { executeValidatedServerAction } from "@/lib/server-action";
import { z } from "@/lib/validation";

const deleteServiceLineSchema = z.object({
  serviceLineId: z.string().uuid("A valid service line id is required."),
});

export async function createFacilityAction(formData: FormData) {
  const result = await executeValidatedServerAction(facilitySchema, Object.fromEntries(formData.entries()), (input) => createFacility(input));

  if (!result.success) {
    redirect(`/admin?error=${encodeURIComponent(result.error.message)}`);
  }

  revalidatePath("/admin");
  redirect(`/admin?message=${encodeURIComponent(`Facility ${result.data.name} created.`)}`);
}

export async function createDepartmentAction(formData: FormData) {
  const result = await executeValidatedServerAction(departmentSchema, Object.fromEntries(formData.entries()), (input) => createDepartment(input));

  if (!result.success) {
    redirect(`/admin?error=${encodeURIComponent(result.error.message)}`);
  }

  revalidatePath("/admin");
  redirect(`/admin?message=${encodeURIComponent(`Department ${result.data.name} created.`)}`);
}

export async function createServiceLineAction(formData: FormData) {
  const result = await executeValidatedServerAction(serviceLineSchema, Object.fromEntries(formData.entries()), (input) => createServiceLine(input));

  if (!result.success) {
    redirect(`/admin?error=${encodeURIComponent(result.error.message)}`);
  }

  revalidatePath("/admin");
  redirect(`/admin?message=${encodeURIComponent(`Service line ${result.data.name} created.`)}`);
}

export async function deleteServiceLineAction(formData: FormData) {
  const result = await executeValidatedServerAction(deleteServiceLineSchema, Object.fromEntries(formData.entries()), async (input) => {
    await deleteServiceLine(input.serviceLineId);
    return { id: input.serviceLineId };
  });

  if (!result.success) {
    redirect(`/admin?error=${encodeURIComponent(result.error.message)}`);
  }

  revalidatePath("/admin");
  redirect("/admin?message=Service%20line%20removed.");
}
