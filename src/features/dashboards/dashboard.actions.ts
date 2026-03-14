"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createDashboard,
  createDashboardWidget,
  deleteDashboardWidget,
} from "@/features/dashboards/dashboard.service";
import {
  dashboardCreateSchema,
  dashboardWidgetRemovalSchema,
  dashboardWidgetSchema,
} from "@/features/dashboards/dashboard.schemas";
import { executeValidatedServerAction } from "@/lib/server-action";

function buildDashboardRedirect(params: { dashboardSlug?: string; message?: string; error?: string }) {
  const query = new URLSearchParams();

  if (params.dashboardSlug) {
    query.set("dashboardSlug", params.dashboardSlug);
  }

  if (params.message) {
    query.set("message", params.message);
  }

  if (params.error) {
    query.set("error", params.error);
  }

  const queryString = query.toString();
  return queryString ? `/dashboard?${queryString}` : "/dashboard";
}

export async function createDashboardAction(formData: FormData) {
  const result = await executeValidatedServerAction(dashboardCreateSchema, Object.fromEntries(formData.entries()), (input) => createDashboard(input));

  if (!result.success) {
    redirect(buildDashboardRedirect({ error: result.error.message }));
  }

  revalidatePath("/dashboard");
  redirect(buildDashboardRedirect({ dashboardSlug: result.data.slug, message: `Dashboard ${result.data.name} created.` }));
}

export async function createDashboardWidgetAction(formData: FormData) {
  const result = await executeValidatedServerAction(dashboardWidgetSchema, Object.fromEntries(formData.entries()), (input) => createDashboardWidget(input));

  if (!result.success) {
    redirect(buildDashboardRedirect({ dashboardSlug: String(formData.get("dashboardSlug") ?? ""), error: result.error.message }));
  }

  revalidatePath("/dashboard");
  redirect(
    buildDashboardRedirect({
      dashboardSlug: result.data.dashboard.slug,
      message: `Widget ${result.data.widget.title} added.`,
    })
  );
}

export async function deleteDashboardWidgetAction(formData: FormData) {
  const result = await executeValidatedServerAction(
    dashboardWidgetRemovalSchema,
    Object.fromEntries(formData.entries()),
    (input) => deleteDashboardWidget(input.widgetId)
  );

  if (!result.success) {
    redirect(buildDashboardRedirect({ dashboardSlug: String(formData.get("dashboardSlug") ?? ""), error: result.error.message }));
  }

  revalidatePath("/dashboard");
  redirect(
    buildDashboardRedirect({
      dashboardSlug: result.data.dashboard.slug,
      message: `Widget ${result.data.widget.title} removed.`,
    })
  );
}

