import type { PostgrestResponse } from "@supabase/supabase-js";

import type { MetricValue, TableInsert, TableUpdate } from "@/types";

import type { AppSupabaseClient } from "@/lib/repositories/base";
import { unwrapMany, unwrapSingle } from "@/lib/repositories/base";

export const metricValueRepository = {
  async listMetricValues(client: AppSupabaseClient, organizationId: string, limit?: number): Promise<MetricValue[]> {
    let query = client.from("metric_values").select("*").eq("organization_id", organizationId).order("as_of_date", { ascending: false });

    if (typeof limit === "number") {
      query = query.limit(limit);
    }

    return unwrapMany<MetricValue>(await query as PostgrestResponse<MetricValue>, "Failed to list metric values.");
  },

  async createMetricValue(client: AppSupabaseClient, value: TableInsert<"metric_values">): Promise<MetricValue> {
    return unwrapSingle(
      await client.from("metric_values").insert(value).select("*").single(),
      "Failed to create metric value."
    );
  },

  async updateMetricValuesByIdentity(
    client: AppSupabaseClient,
    identity: { organizationId: string; metricId: string; asOfDate: string; facilityId: string | null; departmentId: string | null; serviceLineId: string | null },
    update: TableUpdate<"metric_values">
  ): Promise<MetricValue[]> {
    let query = client
      .from("metric_values")
      .update(update)
      .eq("organization_id", identity.organizationId)
      .eq("metric_id", identity.metricId)
      .eq("as_of_date", identity.asOfDate);

    query = identity.facilityId ? query.eq("facility_id", identity.facilityId) : query.is("facility_id", null);
    query = identity.departmentId ? query.eq("department_id", identity.departmentId) : query.is("department_id", null);
    query = identity.serviceLineId ? query.eq("service_line_id", identity.serviceLineId) : query.is("service_line_id", null);

    return unwrapMany<MetricValue>(await query.select("*") as PostgrestResponse<MetricValue>, "Failed to update matching metric values.");
  },
};
