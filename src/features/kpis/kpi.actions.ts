"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createKpiDefinition, createKpiDefinitionVersion, deleteKpiDefinition, updateKpiDefinition } from "@/features/kpis/kpi.service";
import { kpiDefinitionRemovalSchema, kpiDefinitionSchema, kpiDefinitionUpdateSchema } from "@/features/kpis/kpi.schemas";
import { executeValidatedServerAction } from "@/lib/server-action";
import { z } from "@/lib/validation";

function redirectKpiError(message: string): never {
  redirect(`/analytics/catalog?error=${encodeURIComponent(message)}`);
}

function redirectKpiSuccess(message: string): never {
  revalidatePath("/analytics/catalog");
  redirect(`/analytics/catalog?message=${encodeURIComponent(message)}`);
}

const kpiVersionCreationSchema = z.object({
  kpiId: z.string().uuid("A valid KPI id is required."),
});

export async function createKpiDefinitionAction(formData: FormData) {
  const result = await executeValidatedServerAction(kpiDefinitionSchema, Object.fromEntries(formData.entries()), (input) =>
    createKpiDefinition(input)
  );

  if (!result.success) {
    redirectKpiError(result.error.message);
  }

  redirectKpiSuccess(`KPI ${result.data.name} created.`);
}

export async function updateKpiDefinitionAction(formData: FormData) {
  const result = await executeValidatedServerAction(kpiDefinitionUpdateSchema, Object.fromEntries(formData.entries()), (input) =>
    updateKpiDefinition(input.kpiId, input)
  );

  if (!result.success) {
    redirectKpiError(result.error.message);
  }

  redirectKpiSuccess(`KPI ${result.data.name} updated.`);
}

export async function deleteKpiDefinitionAction(formData: FormData) {
  const result = await executeValidatedServerAction(kpiDefinitionRemovalSchema, Object.fromEntries(formData.entries()), async (input) => {
    const definition = await deleteKpiDefinition(input.kpiId);
    return { id: definition.id, name: definition.name };
  });

  if (!result.success) {
    redirectKpiError(result.error.message);
  }

  redirectKpiSuccess(`KPI ${result.data.name} removed.`);
}

export async function createKpiVersionAction(formData: FormData) {
  const result = await executeValidatedServerAction(kpiVersionCreationSchema, Object.fromEntries(formData.entries()), (input) =>
    createKpiDefinitionVersion(input.kpiId)
  );

  if (!result.success) {
    redirectKpiError(result.error.message);
  }

  redirectKpiSuccess(`KPI ${result.data.version.name} version ${result.data.version.version} created.`);
}
