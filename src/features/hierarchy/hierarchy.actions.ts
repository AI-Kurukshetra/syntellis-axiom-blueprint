"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createDepartment,
  createFacility,
  createServiceLine,
  deleteDepartment,
  deleteFacility,
  deleteServiceLine,
  updateDepartment,
  updateFacility,
  updateServiceLine,
} from "@/features/hierarchy/hierarchy.service";
import {
  departmentSchema,
  departmentUpdateSchema,
  facilitySchema,
  facilityUpdateSchema,
  serviceLineSchema,
  serviceLineUpdateSchema,
} from "@/features/hierarchy/hierarchy.schemas";
import { executeValidatedServerAction } from "@/lib/server-action";
import { z } from "@/lib/validation";

const deleteServiceLineSchema = z.object({
  serviceLineId: z.string().uuid("A valid service line id is required."),
});

const deleteFacilitySchema = z.object({
  facilityId: z.string().uuid("A valid facility id is required."),
});

const deleteDepartmentSchema = z.object({
  departmentId: z.string().uuid("A valid department id is required."),
});

const updateFacilityActionSchema = facilityUpdateSchema.extend({
  facilityId: z.string().uuid("A valid facility id is required."),
});

const updateDepartmentActionSchema = departmentUpdateSchema.extend({
  departmentId: z.string().uuid("A valid department id is required."),
});

const updateServiceLineActionSchema = serviceLineUpdateSchema.extend({
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

export async function updateFacilityAction(formData: FormData) {
  const result = await executeValidatedServerAction(updateFacilityActionSchema, Object.fromEntries(formData.entries()), (input) =>
    updateFacility(input.facilityId, input)
  );

  if (!result.success) {
    redirect(`/admin?error=${encodeURIComponent(result.error.message)}`);
  }

  revalidatePath("/admin");
  redirect(`/admin?message=${encodeURIComponent(`Facility ${result.data.name} updated.`)}`);
}

export async function deleteFacilityAction(formData: FormData) {
  const result = await executeValidatedServerAction(deleteFacilitySchema, Object.fromEntries(formData.entries()), async (input) => {
    await deleteFacility(input.facilityId);
    return input;
  });

  if (!result.success) {
    redirect(`/admin?error=${encodeURIComponent(result.error.message)}`);
  }

  revalidatePath("/admin");
  redirect("/admin?message=Facility%20removed.");
}

export async function createDepartmentAction(formData: FormData) {
  const result = await executeValidatedServerAction(departmentSchema, Object.fromEntries(formData.entries()), (input) => createDepartment(input));

  if (!result.success) {
    redirect(`/admin?error=${encodeURIComponent(result.error.message)}`);
  }

  revalidatePath("/admin");
  redirect(`/admin?message=${encodeURIComponent(`Department ${result.data.name} created.`)}`);
}

export async function updateDepartmentAction(formData: FormData) {
  const result = await executeValidatedServerAction(updateDepartmentActionSchema, Object.fromEntries(formData.entries()), (input) =>
    updateDepartment(input.departmentId, input)
  );

  if (!result.success) {
    redirect(`/admin?error=${encodeURIComponent(result.error.message)}`);
  }

  revalidatePath("/admin");
  redirect(`/admin?message=${encodeURIComponent(`Department ${result.data.name} updated.`)}`);
}

export async function deleteDepartmentAction(formData: FormData) {
  const result = await executeValidatedServerAction(deleteDepartmentSchema, Object.fromEntries(formData.entries()), async (input) => {
    await deleteDepartment(input.departmentId);
    return input;
  });

  if (!result.success) {
    redirect(`/admin?error=${encodeURIComponent(result.error.message)}`);
  }

  revalidatePath("/admin");
  redirect("/admin?message=Department%20removed.");
}

export async function createServiceLineAction(formData: FormData) {
  const result = await executeValidatedServerAction(serviceLineSchema, Object.fromEntries(formData.entries()), (input) => createServiceLine(input));

  if (!result.success) {
    redirect(`/admin?error=${encodeURIComponent(result.error.message)}`);
  }

  revalidatePath("/admin");
  redirect(`/admin?message=${encodeURIComponent(`Service line ${result.data.name} created.`)}`);
}

export async function updateServiceLineAction(formData: FormData) {
  const result = await executeValidatedServerAction(updateServiceLineActionSchema, Object.fromEntries(formData.entries()), (input) =>
    updateServiceLine(input.serviceLineId, input)
  );

  if (!result.success) {
    redirect(`/admin?error=${encodeURIComponent(result.error.message)}`);
  }

  revalidatePath("/admin");
  redirect(`/admin?message=${encodeURIComponent(`Service line ${result.data.name} updated.`)}`);
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
