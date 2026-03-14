import type { PostgrestResponse } from "@supabase/supabase-js";

import type { TableInsert, TableUpdate, UserDepartmentAssignment, UserFacilityAssignment, UserProfile } from "@/types";

import type { AppSupabaseClient } from "@/lib/repositories/base";
import { unwrapCount, unwrapMany, unwrapMaybeSingle, unwrapSingle } from "@/lib/repositories/base";

export const profileRepository = {
  async getProfileByUserId(client: AppSupabaseClient, userId: string): Promise<UserProfile | null> {
    return unwrapMaybeSingle(
      await client.from("profiles").select("*").eq("id", userId).maybeSingle(),
      "Failed to load profile."
    );
  },

  async getProfileByWorkEmail(client: AppSupabaseClient, workEmail: string): Promise<UserProfile | null> {
    return unwrapMaybeSingle(
      await client.from("profiles").select("*").eq("work_email", workEmail).maybeSingle(),
      "Failed to load profile by email."
    );
  },

  async upsertProfile(client: AppSupabaseClient, profile: TableInsert<"profiles">): Promise<UserProfile> {
    return unwrapSingle(
      await client.from("profiles").upsert(profile, { onConflict: "id" }).select("*").single(),
      "Failed to upsert profile."
    );
  },

  async updateProfile(client: AppSupabaseClient, userId: string, profile: TableUpdate<"profiles">): Promise<UserProfile> {
    return unwrapSingle(
      await client.from("profiles").update(profile).eq("id", userId).select("*").single(),
      "Failed to update profile."
    );
  },

  async countProfiles(client: AppSupabaseClient, organizationId?: string | null) {
    const query = client.from("profiles").select("*", { count: "exact", head: true });

    return unwrapCount(
      await (organizationId ? query.eq("organization_id", organizationId) : query),
      "Failed to count profiles."
    );
  },

  async listProfilesByOrganization(
    client: AppSupabaseClient,
    organizationId: string,
    limit?: number
  ): Promise<UserProfile[]> {
    let query = client.from("profiles").select("*").eq("organization_id", organizationId).order("created_at", {
      ascending: false,
    });

    if (typeof limit === "number") {
      query = query.limit(limit);
    }

    return unwrapMany<UserProfile>(await query as PostgrestResponse<UserProfile>, "Failed to list organization profiles.");
  },

  async listProfilesByIds(client: AppSupabaseClient, userIds: string[]): Promise<UserProfile[]> {
    if (userIds.length === 0) {
      return [];
    }

    return unwrapMany<UserProfile>(
      await client.from("profiles").select("*").in("id", [...new Set(userIds)]) as PostgrestResponse<UserProfile>,
      "Failed to list profiles by id."
    );
  },

  async listFacilityAssignments(client: AppSupabaseClient, userId: string): Promise<UserFacilityAssignment[]> {
    return unwrapMany<UserFacilityAssignment>(
      await client.from("user_facility_assignments").select("*").eq("user_id", userId) as PostgrestResponse<UserFacilityAssignment>,
      "Failed to load facility assignments."
    );
  },

  async listFacilityAssignmentsByUserIds(client: AppSupabaseClient, userIds: string[]): Promise<UserFacilityAssignment[]> {
    if (userIds.length === 0) {
      return [];
    }

    return unwrapMany<UserFacilityAssignment>(
      await client.from("user_facility_assignments").select("*").in("user_id", [...new Set(userIds)]) as PostgrestResponse<UserFacilityAssignment>,
      "Failed to load facility assignments by user."
    );
  },

  async getFacilityAssignmentById(client: AppSupabaseClient, assignmentId: string): Promise<UserFacilityAssignment | null> {
    return unwrapMaybeSingle(
      await client.from("user_facility_assignments").select("*").eq("id", assignmentId).maybeSingle(),
      "Failed to load facility assignment."
    );
  },

  async createFacilityAssignment(
    client: AppSupabaseClient,
    assignment: TableInsert<"user_facility_assignments">
  ): Promise<UserFacilityAssignment> {
    return unwrapSingle(
      await client.from("user_facility_assignments").insert(assignment).select("*").single(),
      "Failed to create facility assignment."
    );
  },

  async deleteFacilityAssignment(client: AppSupabaseClient, assignmentId: string): Promise<UserFacilityAssignment> {
    return unwrapSingle<UserFacilityAssignment>(
      await client.from("user_facility_assignments").delete().eq("id", assignmentId).select("*").single(),
      "Failed to delete facility assignment."
    );
  },

  async listDepartmentAssignments(client: AppSupabaseClient, userId: string): Promise<UserDepartmentAssignment[]> {
    return unwrapMany<UserDepartmentAssignment>(
      await client.from("user_department_assignments").select("*").eq("user_id", userId) as PostgrestResponse<UserDepartmentAssignment>,
      "Failed to load department assignments."
    );
  },

  async listDepartmentAssignmentsByUserIds(client: AppSupabaseClient, userIds: string[]): Promise<UserDepartmentAssignment[]> {
    if (userIds.length === 0) {
      return [];
    }

    return unwrapMany<UserDepartmentAssignment>(
      await client.from("user_department_assignments").select("*").in("user_id", [...new Set(userIds)]) as PostgrestResponse<UserDepartmentAssignment>,
      "Failed to load department assignments by user."
    );
  },

  async getDepartmentAssignmentById(client: AppSupabaseClient, assignmentId: string): Promise<UserDepartmentAssignment | null> {
    return unwrapMaybeSingle(
      await client.from("user_department_assignments").select("*").eq("id", assignmentId).maybeSingle(),
      "Failed to load department assignment."
    );
  },

  async createDepartmentAssignment(
    client: AppSupabaseClient,
    assignment: TableInsert<"user_department_assignments">
  ): Promise<UserDepartmentAssignment> {
    return unwrapSingle(
      await client.from("user_department_assignments").insert(assignment).select("*").single(),
      "Failed to create department assignment."
    );
  },

  async deleteDepartmentAssignment(client: AppSupabaseClient, assignmentId: string): Promise<UserDepartmentAssignment> {
    return unwrapSingle<UserDepartmentAssignment>(
      await client.from("user_department_assignments").delete().eq("id", assignmentId).select("*").single(),
      "Failed to delete department assignment."
    );
  },
};
