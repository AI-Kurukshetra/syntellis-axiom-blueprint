"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createMetric, deleteMetric, updateMetric } from "@/features/kpis/metric.service";
import { metricRemovalSchema, metricSchema, metricUpdateSchema } from "@/features/kpis/metric.schemas";
import { executeValidatedServerAction } from "@/lib/server-action";

function redirectMetricError(message: string): never {
  redirect(`/analytics/catalog?error=${encodeURIComponent(message)}`);
}

function redirectMetricSuccess(message: string): never {
  revalidatePath("/analytics/catalog");
  redirect(`/analytics/catalog?message=${encodeURIComponent(message)}`);
}

export async function createMetricAction(formData: FormData) {
  const result = await executeValidatedServerAction(metricSchema, Object.fromEntries(formData.entries()), (input) => createMetric(input));

  if (!result.success) {
    redirectMetricError(result.error.message);
  }

  redirectMetricSuccess(`Metric ${result.data.name} created.`);
}

export async function updateMetricAction(formData: FormData) {
  const result = await executeValidatedServerAction(metricUpdateSchema, Object.fromEntries(formData.entries()), (input) =>
    updateMetric(input.metricId, input)
  );

  if (!result.success) {
    redirectMetricError(result.error.message);
  }

  redirectMetricSuccess(`Metric ${result.data.name} updated.`);
}

export async function deleteMetricAction(formData: FormData) {
  const result = await executeValidatedServerAction(metricRemovalSchema, Object.fromEntries(formData.entries()), async (input) => {
    const metric = await deleteMetric(input.metricId);
    return { id: metric.id, name: metric.name };
  });

  if (!result.success) {
    redirectMetricError(result.error.message);
  }

  redirectMetricSuccess(`Metric ${result.data.name} removed.`);
}
