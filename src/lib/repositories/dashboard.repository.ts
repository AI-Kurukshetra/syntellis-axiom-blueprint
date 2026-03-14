import type { PostgrestResponse } from "@supabase/supabase-js";

import type { Dashboard, DashboardWidget, TableInsert, TableUpdate } from "@/types";

import type { AppSupabaseClient } from "@/lib/repositories/base";
import { unwrapMany, unwrapMaybeSingle, unwrapSingle } from "@/lib/repositories/base";

export const dashboardRepository = {
  async listDashboards(client: AppSupabaseClient, organizationId: string): Promise<Dashboard[]> {
    return unwrapMany<Dashboard>(
      await client.from("dashboards").select("*").eq("organization_id", organizationId).order("is_default", { ascending: false }).order("name") as PostgrestResponse<Dashboard>,
      "Failed to list dashboards."
    );
  },

  async getDashboardBySlug(client: AppSupabaseClient, organizationId: string, slug: string): Promise<Dashboard | null> {
    return unwrapMaybeSingle(
      await client.from("dashboards").select("*").eq("organization_id", organizationId).eq("slug", slug).maybeSingle(),
      "Failed to load dashboard by slug."
    );
  },

  async getDashboardById(client: AppSupabaseClient, dashboardId: string): Promise<Dashboard | null> {
    return unwrapMaybeSingle(
      await client.from("dashboards").select("*").eq("id", dashboardId).maybeSingle(),
      "Failed to load dashboard."
    );
  },

  async getDefaultDashboard(client: AppSupabaseClient, organizationId: string): Promise<Dashboard | null> {
    return unwrapMaybeSingle(
      await client.from("dashboards").select("*").eq("organization_id", organizationId).eq("is_default", true).maybeSingle(),
      "Failed to load default dashboard."
    );
  },

  async createDashboard(client: AppSupabaseClient, dashboard: TableInsert<"dashboards">): Promise<Dashboard> {
    return unwrapSingle(
      await client.from("dashboards").insert(dashboard).select("*").single(),
      "Failed to create dashboard."
    );
  },

  async updateDashboard(client: AppSupabaseClient, dashboardId: string, dashboard: TableUpdate<"dashboards">): Promise<Dashboard> {
    return unwrapSingle(
      await client.from("dashboards").update(dashboard).eq("id", dashboardId).select("*").single(),
      "Failed to update dashboard."
    );
  },

  async listDashboardWidgets(client: AppSupabaseClient, dashboardId: string): Promise<DashboardWidget[]> {
    return unwrapMany<DashboardWidget>(
      await client.from("dashboard_widgets").select("*").eq("dashboard_id", dashboardId).order("position_y").order("position_x") as PostgrestResponse<DashboardWidget>,
      "Failed to list dashboard widgets."
    );
  },

  async getDashboardWidgetById(client: AppSupabaseClient, widgetId: string): Promise<DashboardWidget | null> {
    return unwrapMaybeSingle(
      await client.from("dashboard_widgets").select("*").eq("id", widgetId).maybeSingle(),
      "Failed to load dashboard widget."
    );
  },

  async createDashboardWidget(client: AppSupabaseClient, widget: TableInsert<"dashboard_widgets">): Promise<DashboardWidget> {
    return unwrapSingle(
      await client.from("dashboard_widgets").insert(widget).select("*").single(),
      "Failed to create dashboard widget."
    );
  },

  async deleteDashboardWidget(client: AppSupabaseClient, widgetId: string): Promise<DashboardWidget> {
    return unwrapSingle(
      await client.from("dashboard_widgets").delete().eq("id", widgetId).select("*").single(),
      "Failed to delete dashboard widget."
    );
  },
};
