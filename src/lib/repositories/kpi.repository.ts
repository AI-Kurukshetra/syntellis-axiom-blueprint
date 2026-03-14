import type { PostgrestResponse } from "@supabase/supabase-js";

import type { KpiDefinition, TableInsert, TableUpdate } from "@/types";

import type { AppSupabaseClient } from "@/lib/repositories/base";
import { unwrapMany, unwrapMaybeSingle, unwrapSingle } from "@/lib/repositories/base";

export const kpiRepository = {
  async listKpiDefinitions(client: AppSupabaseClient, organizationId: string, limit?: number): Promise<KpiDefinition[]> {
    let query = client
      .from("kpi_definitions")
      .select("*")
      .eq("organization_id", organizationId)
      .order("domain")
      .order("name")
      .order("version", { ascending: false });

    if (typeof limit === "number") {
      query = query.limit(limit);
    }

    return unwrapMany<KpiDefinition>(await query as PostgrestResponse<KpiDefinition>, "Failed to list KPI definitions.");
  },

  async getKpiDefinitionById(client: AppSupabaseClient, kpiId: string): Promise<KpiDefinition | null> {
    return unwrapMaybeSingle(
      await client.from("kpi_definitions").select("*").eq("id", kpiId).maybeSingle(),
      "Failed to load KPI definition."
    );
  },

  async getKpiDefinitionByCode(
    client: AppSupabaseClient,
    organizationId: string,
    code: string,
    version: number
  ): Promise<KpiDefinition | null> {
    return unwrapMaybeSingle(
      await client
        .from("kpi_definitions")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("code", code)
        .eq("version", version)
        .maybeSingle(),
      "Failed to load KPI definition by code."
    );
  },

  async createKpiDefinition(client: AppSupabaseClient, definition: TableInsert<"kpi_definitions">): Promise<KpiDefinition> {
    return unwrapSingle(
      await client.from("kpi_definitions").insert(definition).select("*").single(),
      "Failed to create KPI definition."
    );
  },

  async updateKpiDefinition(
    client: AppSupabaseClient,
    kpiId: string,
    definition: TableUpdate<"kpi_definitions">
  ): Promise<KpiDefinition> {
    return unwrapSingle(
      await client.from("kpi_definitions").update(definition).eq("id", kpiId).select("*").single(),
      "Failed to update KPI definition."
    );
  },

  async deleteKpiDefinition(client: AppSupabaseClient, kpiId: string): Promise<KpiDefinition> {
    return unwrapSingle(
      await client.from("kpi_definitions").delete().eq("id", kpiId).select("*").single(),
      "Failed to delete KPI definition."
    );
  },
};
