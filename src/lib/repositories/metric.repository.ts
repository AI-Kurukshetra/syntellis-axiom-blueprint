import type { PostgrestResponse } from "@supabase/supabase-js";

import type { Metric, TableInsert, TableUpdate } from "@/types";

import type { AppSupabaseClient } from "@/lib/repositories/base";
import { unwrapMany, unwrapMaybeSingle, unwrapSingle } from "@/lib/repositories/base";

export const metricRepository = {
  async listMetrics(client: AppSupabaseClient, organizationId: string, limit?: number): Promise<Metric[]> {
    let query = client
      .from("metrics")
      .select("*")
      .eq("organization_id", organizationId)
      .order("domain")
      .order("name");

    if (typeof limit === "number") {
      query = query.limit(limit);
    }

    return unwrapMany<Metric>(await query as PostgrestResponse<Metric>, "Failed to list metrics.");
  },

  async getMetricById(client: AppSupabaseClient, metricId: string): Promise<Metric | null> {
    return unwrapMaybeSingle(
      await client.from("metrics").select("*").eq("id", metricId).maybeSingle(),
      "Failed to load metric."
    );
  },

  async getMetricByCode(client: AppSupabaseClient, organizationId: string, code: string): Promise<Metric | null> {
    return unwrapMaybeSingle(
      await client.from("metrics").select("*").eq("organization_id", organizationId).eq("code", code).maybeSingle(),
      "Failed to load metric by code."
    );
  },

  async createMetric(client: AppSupabaseClient, metric: TableInsert<"metrics">): Promise<Metric> {
    return unwrapSingle(
      await client.from("metrics").insert(metric).select("*").single(),
      "Failed to create metric."
    );
  },

  async updateMetric(client: AppSupabaseClient, metricId: string, metric: TableUpdate<"metrics">): Promise<Metric> {
    return unwrapSingle(
      await client.from("metrics").update(metric).eq("id", metricId).select("*").single(),
      "Failed to update metric."
    );
  },

  async deleteMetric(client: AppSupabaseClient, metricId: string): Promise<Metric> {
    return unwrapSingle(
      await client.from("metrics").delete().eq("id", metricId).select("*").single(),
      "Failed to delete metric."
    );
  },
};
