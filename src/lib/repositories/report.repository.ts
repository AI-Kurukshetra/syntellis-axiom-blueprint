import type { PostgrestResponse } from "@supabase/supabase-js";

import type { Report, TableInsert, TableRow, TableUpdate } from "@/types";

import type { AppSupabaseClient } from "@/lib/repositories/base";
import { unwrapMany, unwrapMaybeSingle, unwrapSingle } from "@/lib/repositories/base";

export const reportRepository = {
  async listReports(client: AppSupabaseClient, organizationId: string, limit?: number): Promise<Report[]> {
    let query = client.from("reports").select("*").eq("organization_id", organizationId).order("updated_at", { ascending: false });

    if (typeof limit === "number") {
      query = query.limit(limit);
    }

    return unwrapMany<Report>(await query as PostgrestResponse<Report>, "Failed to list reports.");
  },

  async getReportById(client: AppSupabaseClient, reportId: string): Promise<Report | null> {
    return unwrapMaybeSingle(
      await client.from("reports").select("*").eq("id", reportId).maybeSingle(),
      "Failed to load report."
    );
  },

  async getReportBySlug(client: AppSupabaseClient, organizationId: string, slug: string): Promise<Report | null> {
    return unwrapMaybeSingle(
      await client.from("reports").select("*").eq("organization_id", organizationId).eq("slug", slug).maybeSingle(),
      "Failed to load report by slug."
    );
  },

  async createReport(client: AppSupabaseClient, report: TableInsert<"reports">): Promise<Report> {
    return unwrapSingle(
      await client.from("reports").insert(report).select("*").single(),
      "Failed to create report."
    );
  },

  async updateReport(client: AppSupabaseClient, reportId: string, report: TableUpdate<"reports">): Promise<Report> {
    return unwrapSingle(
      await client.from("reports").update(report).eq("id", reportId).select("*").single(),
      "Failed to update report."
    );
  },

  async deleteReport(client: AppSupabaseClient, reportId: string): Promise<Report> {
    return unwrapSingle(
      await client.from("reports").delete().eq("id", reportId).select("*").single(),
      "Failed to delete report."
    );
  },

  async listReportSchedules(client: AppSupabaseClient, organizationId: string, reportId?: string): Promise<TableRow<"report_schedules">[]> {
    let query = client.from("report_schedules").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false });

    if (reportId) {
      query = query.eq("report_id", reportId);
    }

    return unwrapMany<TableRow<"report_schedules">>(await query as PostgrestResponse<TableRow<"report_schedules">>, "Failed to list report schedules.");
  },

  async getReportScheduleById(client: AppSupabaseClient, scheduleId: string): Promise<TableRow<"report_schedules"> | null> {
    return unwrapMaybeSingle(
      await client.from("report_schedules").select("*").eq("id", scheduleId).maybeSingle(),
      "Failed to load report schedule."
    );
  },

  async createReportSchedule(client: AppSupabaseClient, schedule: TableInsert<"report_schedules">): Promise<TableRow<"report_schedules">> {
    return unwrapSingle(
      await client.from("report_schedules").insert(schedule).select("*").single(),
      "Failed to create report schedule."
    );
  },

  async deleteReportSchedule(client: AppSupabaseClient, scheduleId: string): Promise<TableRow<"report_schedules">> {
    return unwrapSingle(
      await client.from("report_schedules").delete().eq("id", scheduleId).select("*").single(),
      "Failed to delete report schedule."
    );
  },

  async listReportRuns(client: AppSupabaseClient, organizationId: string, reportId?: string): Promise<TableRow<"report_runs">[]> {
    let query = client.from("report_runs").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false });

    if (reportId) {
      query = query.eq("report_id", reportId);
    }

    return unwrapMany<TableRow<"report_runs">>(await query as PostgrestResponse<TableRow<"report_runs">>, "Failed to list report runs.");
  },

  async createReportRun(client: AppSupabaseClient, run: TableInsert<"report_runs">): Promise<TableRow<"report_runs">> {
    return unwrapSingle(
      await client.from("report_runs").insert(run).select("*").single(),
      "Failed to create report run."
    );
  },

  async updateReportRun(client: AppSupabaseClient, runId: string, run: TableUpdate<"report_runs">): Promise<TableRow<"report_runs">> {
    return unwrapSingle(
      await client.from("report_runs").update(run).eq("id", runId).select("*").single(),
      "Failed to update report run."
    );
  },
};
