"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { metricValuePublishSchema } from "@/features/kpis/metric-value.schemas";
import { publishMetricValue } from "@/features/kpis/metric-value.service";
import { executeValidatedServerAction } from "@/lib/server-action";

export async function publishMetricValueAction(formData: FormData) {
  const result = await executeValidatedServerAction(metricValuePublishSchema, Object.fromEntries(formData.entries()), (input) => publishMetricValue(input));

  if (!result.success) {
    redirect(`/analytics/catalog?error=${encodeURIComponent(result.error.message)}`);
  }

  revalidatePath("/analytics/catalog");
  redirect(`/analytics/catalog?message=${encodeURIComponent("Metric value published.")}`);
}
