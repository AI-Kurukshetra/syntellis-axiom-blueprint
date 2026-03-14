import type { PostgrestResponse } from "@supabase/supabase-js";

import type { Benchmark, TableInsert, TableUpdate } from "@/types";

import type { AppSupabaseClient } from "@/lib/repositories/base";
import { unwrapMany, unwrapMaybeSingle, unwrapSingle } from "@/lib/repositories/base";

export const benchmarkRepository = {
  async listBenchmarks(client: AppSupabaseClient, organizationId: string, limit?: number): Promise<Benchmark[]> {
    let query = client
      .from("benchmarks")
      .select("*")
      .eq("organization_id", organizationId)
      .order("domain")
      .order("name")
      .order("version", { ascending: false });

    if (typeof limit === "number") {
      query = query.limit(limit);
    }

    return unwrapMany<Benchmark>(await query as PostgrestResponse<Benchmark>, "Failed to list benchmarks.");
  },

  async listBenchmarksByMetricIds(client: AppSupabaseClient, organizationId: string, metricIds: string[]): Promise<Benchmark[]> {
    if (metricIds.length === 0) {
      return [];
    }

    return unwrapMany<Benchmark>(
      await client.from("benchmarks").select("*").eq("organization_id", organizationId).in("metric_id", [...new Set(metricIds)]) as PostgrestResponse<Benchmark>,
      "Failed to list benchmarks by metric ids."
    );
  },

  async getBenchmarkById(client: AppSupabaseClient, benchmarkId: string): Promise<Benchmark | null> {
    return unwrapMaybeSingle(
      await client.from("benchmarks").select("*").eq("id", benchmarkId).maybeSingle(),
      "Failed to load benchmark."
    );
  },

  async createBenchmark(client: AppSupabaseClient, benchmark: TableInsert<"benchmarks">): Promise<Benchmark> {
    return unwrapSingle(
      await client.from("benchmarks").insert(benchmark).select("*").single(),
      "Failed to create benchmark."
    );
  },

  async updateBenchmark(client: AppSupabaseClient, benchmarkId: string, benchmark: TableUpdate<"benchmarks">): Promise<Benchmark> {
    return unwrapSingle(
      await client.from("benchmarks").update(benchmark).eq("id", benchmarkId).select("*").single(),
      "Failed to update benchmark."
    );
  },

  async deleteBenchmark(client: AppSupabaseClient, benchmarkId: string): Promise<Benchmark> {
    return unwrapSingle(
      await client.from("benchmarks").delete().eq("id", benchmarkId).select("*").single(),
      "Failed to delete benchmark."
    );
  },
};
