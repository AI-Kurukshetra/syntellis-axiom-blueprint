import type { PostgrestResponse } from "@supabase/supabase-js";

import type { TableInsert, TableUpdate, Target } from "@/types";

import type { AppSupabaseClient } from "@/lib/repositories/base";
import { unwrapMany, unwrapMaybeSingle, unwrapSingle } from "@/lib/repositories/base";

export const targetRepository = {
  async listTargets(client: AppSupabaseClient, organizationId: string, limit?: number): Promise<Target[]> {
    let query = client.from("targets").select("*").eq("organization_id", organizationId).order("period_start", { ascending: false });

    if (typeof limit === "number") {
      query = query.limit(limit);
    }

    return unwrapMany<Target>(await query as PostgrestResponse<Target>, "Failed to list targets.");
  },

  async listTargetsByMetricIds(client: AppSupabaseClient, organizationId: string, metricIds: string[]): Promise<Target[]> {
    if (metricIds.length === 0) {
      return [];
    }

    return unwrapMany<Target>(
      await client.from("targets").select("*").eq("organization_id", organizationId).in("metric_id", [...new Set(metricIds)]) as PostgrestResponse<Target>,
      "Failed to list targets by metric ids."
    );
  },

  async getTargetById(client: AppSupabaseClient, targetId: string): Promise<Target | null> {
    return unwrapMaybeSingle(
      await client.from("targets").select("*").eq("id", targetId).maybeSingle(),
      "Failed to load target."
    );
  },

  async createTarget(client: AppSupabaseClient, target: TableInsert<"targets">): Promise<Target> {
    return unwrapSingle(
      await client.from("targets").insert(target).select("*").single(),
      "Failed to create target."
    );
  },

  async updateTarget(client: AppSupabaseClient, targetId: string, target: TableUpdate<"targets">): Promise<Target> {
    return unwrapSingle(
      await client.from("targets").update(target).eq("id", targetId).select("*").single(),
      "Failed to update target."
    );
  },

  async deleteTarget(client: AppSupabaseClient, targetId: string): Promise<Target> {
    return unwrapSingle(
      await client.from("targets").delete().eq("id", targetId).select("*").single(),
      "Failed to delete target."
    );
  },
};
