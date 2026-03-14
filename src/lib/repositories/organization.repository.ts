import type { PostgrestResponse } from "@supabase/supabase-js";

import type { Department, Facility, Organization, ServiceLine, TableInsert, TableUpdate } from "@/types";

import type { AppSupabaseClient } from "@/lib/repositories/base";
import { assertNoError, unwrapCount, unwrapMany, unwrapMaybeSingle, unwrapSingle } from "@/lib/repositories/base";

export const organizationRepository = {
  async countOrganizations(client: AppSupabaseClient, organizationId?: string | null) {
    const query = client.from("organizations").select("*", { count: "exact", head: true });

    return unwrapCount(
      await (organizationId ? query.eq("id", organizationId) : query),
      "Failed to count organizations."
    );
  },

  async getOrganizationById(client: AppSupabaseClient, organizationId: string): Promise<Organization | null> {
    return unwrapMaybeSingle(
      await client.from("organizations").select("*").eq("id", organizationId).maybeSingle(),
      "Failed to load organization."
    );
  },

  async getOrganizationBySlug(client: AppSupabaseClient, slug: string): Promise<Organization | null> {
    return unwrapMaybeSingle(
      await client.from("organizations").select("*").eq("slug", slug).maybeSingle(),
      "Failed to load organization by slug."
    );
  },

  async createOrganization(client: AppSupabaseClient, organization: TableInsert<"organizations">): Promise<Organization> {
    return unwrapSingle(
      await client.from("organizations").insert(organization).select("*").single(),
      "Failed to create organization."
    );
  },

  async updateOrganization(
    client: AppSupabaseClient,
    organizationId: string,
    organization: TableUpdate<"organizations">
  ): Promise<Organization> {
    return unwrapSingle(
      await client.from("organizations").update(organization).eq("id", organizationId).select("*").single(),
      "Failed to update organization."
    );
  },

  async listOrganizations(client: AppSupabaseClient, organizationId?: string | null): Promise<Organization[]> {
    const query = client.from("organizations").select("*").order("name");

    return unwrapMany<Organization>(
      (await (organizationId ? query.eq("id", organizationId) : query)) as PostgrestResponse<Organization>,
      "Failed to list organizations."
    );
  },

  async countFacilities(client: AppSupabaseClient, organizationId: string) {
    return unwrapCount(
      await client.from("facilities").select("*", { count: "exact", head: true }).eq("organization_id", organizationId),
      "Failed to count facilities."
    );
  },

  async listFacilities(client: AppSupabaseClient, organizationId: string, limit?: number): Promise<Facility[]> {
    let query = client.from("facilities").select("*").eq("organization_id", organizationId).order("name");

    if (typeof limit === "number") {
      query = query.limit(limit);
    }

    return unwrapMany<Facility>(await query as PostgrestResponse<Facility>, "Failed to list facilities.");
  },

  async getFacilityById(client: AppSupabaseClient, facilityId: string): Promise<Facility | null> {
    return unwrapMaybeSingle(
      await client.from("facilities").select("*").eq("id", facilityId).maybeSingle(),
      "Failed to load facility."
    );
  },

  async createFacility(client: AppSupabaseClient, facility: TableInsert<"facilities">): Promise<Facility> {
    return unwrapSingle(
      await client.from("facilities").insert(facility).select("*").single(),
      "Failed to create facility."
    );
  },

  async updateFacility(client: AppSupabaseClient, facilityId: string, facility: TableUpdate<"facilities">): Promise<Facility> {
    return unwrapSingle(
      await client.from("facilities").update(facility).eq("id", facilityId).select("*").single(),
      "Failed to update facility."
    );
  },

  async deleteFacility(client: AppSupabaseClient, facilityId: string) {
    assertNoError(await client.from("facilities").delete().eq("id", facilityId), "Failed to delete facility.");
  },

  async countDepartments(client: AppSupabaseClient, organizationId: string) {
    return unwrapCount(
      await client.from("departments").select("*", { count: "exact", head: true }).eq("organization_id", organizationId),
      "Failed to count departments."
    );
  },

  async listDepartments(client: AppSupabaseClient, organizationId: string, limit?: number): Promise<Department[]> {
    let query = client.from("departments").select("*").eq("organization_id", organizationId).order("name");

    if (typeof limit === "number") {
      query = query.limit(limit);
    }

    return unwrapMany<Department>(await query as PostgrestResponse<Department>, "Failed to list departments.");
  },

  async listDepartmentsByFacility(
    client: AppSupabaseClient,
    organizationId: string,
    facilityId: string,
    limit?: number
  ): Promise<Department[]> {
    let query = client
      .from("departments")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("facility_id", facilityId)
      .order("name");

    if (typeof limit === "number") {
      query = query.limit(limit);
    }

    return unwrapMany<Department>(await query as PostgrestResponse<Department>, "Failed to list facility departments.");
  },

  async getDepartmentById(client: AppSupabaseClient, departmentId: string): Promise<Department | null> {
    return unwrapMaybeSingle(
      await client.from("departments").select("*").eq("id", departmentId).maybeSingle(),
      "Failed to load department."
    );
  },

  async createDepartment(client: AppSupabaseClient, department: TableInsert<"departments">): Promise<Department> {
    return unwrapSingle(
      await client.from("departments").insert(department).select("*").single(),
      "Failed to create department."
    );
  },

  async updateDepartment(client: AppSupabaseClient, departmentId: string, department: TableUpdate<"departments">): Promise<Department> {
    return unwrapSingle(
      await client.from("departments").update(department).eq("id", departmentId).select("*").single(),
      "Failed to update department."
    );
  },

  async deleteDepartment(client: AppSupabaseClient, departmentId: string) {
    assertNoError(await client.from("departments").delete().eq("id", departmentId), "Failed to delete department.");
  },

  async listServiceLines(client: AppSupabaseClient, organizationId: string, limit?: number): Promise<ServiceLine[]> {
    let query = client.from("service_lines").select("*").eq("organization_id", organizationId).order("name");

    if (typeof limit === "number") {
      query = query.limit(limit);
    }

    return unwrapMany<ServiceLine>(await query as PostgrestResponse<ServiceLine>, "Failed to list service lines.");
  },

  async listServiceLinesByFacility(
    client: AppSupabaseClient,
    organizationId: string,
    facilityId: string,
    limit?: number
  ): Promise<ServiceLine[]> {
    let query = client
      .from("service_lines")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("facility_id", facilityId)
      .order("name");

    if (typeof limit === "number") {
      query = query.limit(limit);
    }

    return unwrapMany<ServiceLine>(await query as PostgrestResponse<ServiceLine>, "Failed to list facility service lines.");
  },

  async getServiceLineById(client: AppSupabaseClient, serviceLineId: string): Promise<ServiceLine | null> {
    return unwrapMaybeSingle(
      await client.from("service_lines").select("*").eq("id", serviceLineId).maybeSingle(),
      "Failed to load service line."
    );
  },

  async createServiceLine(client: AppSupabaseClient, serviceLine: TableInsert<"service_lines">): Promise<ServiceLine> {
    return unwrapSingle(
      await client.from("service_lines").insert(serviceLine).select("*").single(),
      "Failed to create service line."
    );
  },

  async updateServiceLine(
    client: AppSupabaseClient,
    serviceLineId: string,
    serviceLine: TableUpdate<"service_lines">
  ): Promise<ServiceLine> {
    return unwrapSingle(
      await client.from("service_lines").update(serviceLine).eq("id", serviceLineId).select("*").single(),
      "Failed to update service line."
    );
  },

  async deleteServiceLine(client: AppSupabaseClient, serviceLineId: string) {
    assertNoError(await client.from("service_lines").delete().eq("id", serviceLineId), "Failed to delete service line.");
  },
};
