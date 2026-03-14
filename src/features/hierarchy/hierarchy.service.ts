import type { DepartmentInput, FacilityInput, Organization, ServiceLine, ServiceLineInput } from "@/types";

import { safeLogAuditEvent } from "@/lib/audit";
import { requireAdminAccess } from "@/lib/auth/authorization";
import { ForbiddenError, NotFoundError } from "@/lib/http-errors";
import { organizationRepository } from "@/lib/repositories/organization.repository";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

function normalizeOptional(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeUuid(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeCountryCode(value?: string | null) {
  const normalized = value?.trim().toUpperCase();
  return normalized ? normalized : null;
}

async function requireOrganizationAdminContext() {
  const currentUser = await requireAdminAccess();
  const organizationId = currentUser.profile?.organization_id;

  if (!organizationId || !currentUser.organization) {
    throw new ForbiddenError("An organization context is required to manage hierarchy records.");
  }

  return {
    currentUser,
    organizationId,
    organization: currentUser.organization,
  };
}

function mapFacilityInput(input: FacilityInput, organization: Organization) {
  return {
    organization_id: organization.id,
    service_line_id: normalizeUuid(input.serviceLineId),
    code: input.code.trim(),
    name: input.name.trim(),
    facility_type: normalizeOptional(input.facilityType),
    status: input.status ?? "active",
    timezone: input.timezone.trim() || organization.timezone,
    address_line_1: normalizeOptional(input.addressLine1),
    address_line_2: normalizeOptional(input.addressLine2),
    city: normalizeOptional(input.city),
    state_region: normalizeOptional(input.stateRegion),
    postal_code: normalizeOptional(input.postalCode),
    country_code: normalizeCountryCode(input.countryCode),
    metadata: {},
    effective_from: normalizeOptional(input.effectiveFrom),
    effective_to: normalizeOptional(input.effectiveTo),
  };
}

function mapDepartmentInput(input: DepartmentInput, organizationId: string) {
  return {
    organization_id: organizationId,
    facility_id: input.facilityId,
    service_line_id: normalizeUuid(input.serviceLineId),
    parent_department_id: normalizeOptional(input.parentDepartmentId),
    code: input.code.trim(),
    name: input.name.trim(),
    description: normalizeOptional(input.description),
    status: input.status ?? "active",
    metadata: {},
    effective_from: normalizeOptional(input.effectiveFrom),
    effective_to: normalizeOptional(input.effectiveTo),
  };
}

function mapServiceLineInput(input: ServiceLineInput, organizationId: string) {
  return {
    organization_id: organizationId,
    facility_id: normalizeUuid(input.facilityId),
    code: input.code.trim(),
    name: input.name.trim(),
    description: normalizeOptional(input.description),
    status: input.status ?? "active",
    metadata: {},
    effective_from: normalizeOptional(input.effectiveFrom),
    effective_to: normalizeOptional(input.effectiveTo),
  };
}

async function requireFacilityInOrganization(facilityId: string, organizationId: string) {
  const adminClient = getSupabaseAdminClient();
  const facility = await organizationRepository.getFacilityById(adminClient, facilityId);

  if (!facility || facility.organization_id !== organizationId) {
    throw new NotFoundError("The selected facility does not exist in the current organization.");
  }

  return facility;
}

async function requireDepartmentInOrganization(departmentId: string, organizationId: string) {
  const adminClient = getSupabaseAdminClient();
  const department = await organizationRepository.getDepartmentById(adminClient, departmentId);

  if (!department || department.organization_id !== organizationId) {
    throw new NotFoundError("The selected department does not exist in the current organization.");
  }

  return department;
}

async function requireServiceLineInOrganization(serviceLineId: string, organizationId: string) {
  const adminClient = getSupabaseAdminClient();
  const serviceLine = await organizationRepository.getServiceLineById(adminClient, serviceLineId);

  if (!serviceLine || serviceLine.organization_id !== organizationId) {
    throw new NotFoundError("The selected service line does not exist in the current organization.");
  }

  return serviceLine;
}

async function resolveScopedServiceLine(serviceLineId: string | null, organizationId: string, facilityId?: string | null) {
  if (!serviceLineId) {
    return null;
  }

  const serviceLine = await requireServiceLineInOrganization(serviceLineId, organizationId);

  if (facilityId && serviceLine.facility_id && serviceLine.facility_id !== facilityId) {
    throw new Error("The selected service line belongs to a different facility.");
  }

  return serviceLine;
}

export async function listFacilities(limit = 50) {
  const { organizationId, organization } = await requireOrganizationAdminContext();
  const client = await getSupabaseServerClient();
  const facilities = await organizationRepository.listFacilities(client, organizationId, limit);

  return {
    organization,
    facilities,
  };
}

export async function getFacility(facilityId: string) {
  const { organizationId } = await requireOrganizationAdminContext();
  return requireFacilityInOrganization(facilityId, organizationId);
}

export async function createFacility(input: FacilityInput) {
  const { currentUser, organization } = await requireOrganizationAdminContext();
  const adminClient = getSupabaseAdminClient();
  const serviceLine = await resolveScopedServiceLine(normalizeUuid(input.serviceLineId), organization.id);
  const facility = await organizationRepository.createFacility(adminClient, mapFacilityInput(input, organization));

  await safeLogAuditEvent({
    organizationId: organization.id,
    actorUserId: currentUser.authUser.id,
    action: "facility.created",
    entityType: "facility",
    entityId: facility.id,
    scopeLevel: "facility",
    facilityId: facility.id,
    metadata: {
      code: facility.code,
      name: facility.name,
      service_line_id: serviceLine?.id ?? null,
    },
  });

  return facility;
}

export async function updateFacility(facilityId: string, input: Partial<FacilityInput>) {
  const { currentUser, organizationId } = await requireOrganizationAdminContext();
  const adminClient = getSupabaseAdminClient();
  const existingFacility = await requireFacilityInOrganization(facilityId, organizationId);

  if (input.serviceLineId !== undefined) {
    await resolveScopedServiceLine(normalizeUuid(input.serviceLineId), organizationId);
  }

  const facility = await organizationRepository.updateFacility(adminClient, facilityId, {
    service_line_id: input.serviceLineId === undefined ? undefined : normalizeUuid(input.serviceLineId),
    code: input.code?.trim(),
    name: input.name?.trim(),
    facility_type: normalizeOptional(input.facilityType),
    timezone: input.timezone?.trim(),
    status: input.status,
    address_line_1: normalizeOptional(input.addressLine1),
    address_line_2: normalizeOptional(input.addressLine2),
    city: normalizeOptional(input.city),
    state_region: normalizeOptional(input.stateRegion),
    postal_code: normalizeOptional(input.postalCode),
    country_code: normalizeCountryCode(input.countryCode),
    effective_from: normalizeOptional(input.effectiveFrom),
    effective_to: normalizeOptional(input.effectiveTo),
  });

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "facility.updated",
    entityType: "facility",
    entityId: facility.id,
    scopeLevel: "facility",
    facilityId: facility.id,
    metadata: {
      previous_code: existingFacility.code,
      code: facility.code,
      name: facility.name,
      service_line_id: facility.service_line_id,
    },
  });

  return facility;
}

export async function deleteFacility(facilityId: string) {
  const { currentUser, organizationId } = await requireOrganizationAdminContext();
  const adminClient = getSupabaseAdminClient();
  const facility = await requireFacilityInOrganization(facilityId, organizationId);
  await organizationRepository.deleteFacility(adminClient, facilityId);

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "facility.deleted",
    entityType: "facility",
    entityId: facility.id,
    scopeLevel: "facility",
    facilityId: facility.id,
    metadata: {
      code: facility.code,
      name: facility.name,
    },
  });
}

export async function listDepartments(limit = 50, facilityId?: string) {
  const { organizationId, organization } = await requireOrganizationAdminContext();
  const client = await getSupabaseServerClient();

  if (facilityId) {
    await requireFacilityInOrganization(facilityId, organizationId);
  }

  const departments = facilityId
    ? await organizationRepository.listDepartmentsByFacility(client, organizationId, facilityId, limit)
    : await organizationRepository.listDepartments(client, organizationId, limit);

  return {
    organization,
    departments,
  };
}

export async function getDepartment(departmentId: string) {
  const { organizationId } = await requireOrganizationAdminContext();
  return requireDepartmentInOrganization(departmentId, organizationId);
}

export async function createDepartment(input: DepartmentInput) {
  const { currentUser, organizationId } = await requireOrganizationAdminContext();
  const adminClient = getSupabaseAdminClient();
  const facility = await requireFacilityInOrganization(input.facilityId, organizationId);
  const serviceLine = await resolveScopedServiceLine(normalizeUuid(input.serviceLineId), organizationId, facility.id);

  if (input.parentDepartmentId) {
    await requireDepartmentInOrganization(input.parentDepartmentId, organizationId);
  }

  const department = await organizationRepository.createDepartment(adminClient, mapDepartmentInput(input, organizationId));

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "department.created",
    entityType: "department",
    entityId: department.id,
    scopeLevel: "department",
    facilityId: facility.id,
    departmentId: department.id,
    metadata: {
      code: department.code,
      name: department.name,
      facility_code: facility.code,
      service_line_id: serviceLine?.id ?? null,
    },
  });

  return department;
}

export async function updateDepartment(departmentId: string, input: Partial<DepartmentInput>) {
  const { currentUser, organizationId } = await requireOrganizationAdminContext();
  const adminClient = getSupabaseAdminClient();
  const existingDepartment = await requireDepartmentInOrganization(departmentId, organizationId);
  const targetFacilityId = input.facilityId ?? existingDepartment.facility_id;

  if (input.facilityId) {
    await requireFacilityInOrganization(input.facilityId, organizationId);
  }

  if (input.parentDepartmentId) {
    await requireDepartmentInOrganization(input.parentDepartmentId, organizationId);
  }

  if (input.serviceLineId !== undefined) {
    await resolveScopedServiceLine(normalizeUuid(input.serviceLineId), organizationId, targetFacilityId);
  }

  const department = await organizationRepository.updateDepartment(adminClient, departmentId, {
    facility_id: input.facilityId,
    service_line_id: input.serviceLineId === undefined ? undefined : normalizeUuid(input.serviceLineId),
    parent_department_id: normalizeOptional(input.parentDepartmentId),
    code: input.code?.trim(),
    name: input.name?.trim(),
    description: normalizeOptional(input.description),
    status: input.status,
    effective_from: normalizeOptional(input.effectiveFrom),
    effective_to: normalizeOptional(input.effectiveTo),
  });

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "department.updated",
    entityType: "department",
    entityId: department.id,
    scopeLevel: "department",
    facilityId: department.facility_id,
    departmentId: department.id,
    metadata: {
      previous_code: existingDepartment.code,
      code: department.code,
      name: department.name,
      service_line_id: department.service_line_id,
    },
  });

  return department;
}

export async function deleteDepartment(departmentId: string) {
  const { currentUser, organizationId } = await requireOrganizationAdminContext();
  const adminClient = getSupabaseAdminClient();
  const department = await requireDepartmentInOrganization(departmentId, organizationId);
  await organizationRepository.deleteDepartment(adminClient, departmentId);

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "department.deleted",
    entityType: "department",
    entityId: department.id,
    scopeLevel: "department",
    facilityId: department.facility_id,
    departmentId: department.id,
    metadata: {
      code: department.code,
      name: department.name,
    },
  });
}

export async function listServiceLines(limit = 50, facilityId?: string) {
  const { organizationId, organization } = await requireOrganizationAdminContext();
  const client = await getSupabaseServerClient();

  if (facilityId) {
    await requireFacilityInOrganization(facilityId, organizationId);
  }

  const serviceLines = facilityId
    ? await organizationRepository.listServiceLinesByFacility(client, organizationId, facilityId, limit)
    : await organizationRepository.listServiceLines(client, organizationId, limit);

  return {
    organization,
    serviceLines,
  };
}

export async function getServiceLine(serviceLineId: string) {
  const { organizationId } = await requireOrganizationAdminContext();
  return requireServiceLineInOrganization(serviceLineId, organizationId);
}

export async function createServiceLine(input: ServiceLineInput) {
  const { currentUser, organizationId } = await requireOrganizationAdminContext();
  const adminClient = getSupabaseAdminClient();
  const facility = input.facilityId ? await requireFacilityInOrganization(input.facilityId, organizationId) : null;
  const serviceLine = await organizationRepository.createServiceLine(adminClient, mapServiceLineInput(input, organizationId));

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "service_line.created",
    entityType: "service_line",
    entityId: serviceLine.id,
    scopeLevel: facility ? "facility" : "organization",
    facilityId: facility?.id ?? null,
    metadata: {
      code: serviceLine.code,
      name: serviceLine.name,
    },
  });

  return serviceLine;
}

export async function updateServiceLine(serviceLineId: string, input: Partial<ServiceLineInput>) {
  const { currentUser, organizationId } = await requireOrganizationAdminContext();
  const adminClient = getSupabaseAdminClient();
  const existingServiceLine = await requireServiceLineInOrganization(serviceLineId, organizationId);

  if (input.facilityId) {
    await requireFacilityInOrganization(input.facilityId, organizationId);
  }

  const serviceLine = await organizationRepository.updateServiceLine(adminClient, serviceLineId, {
    facility_id: input.facilityId === undefined ? undefined : normalizeUuid(input.facilityId),
    code: input.code?.trim(),
    name: input.name?.trim(),
    description: normalizeOptional(input.description),
    status: input.status,
    effective_from: normalizeOptional(input.effectiveFrom),
    effective_to: normalizeOptional(input.effectiveTo),
  });

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "service_line.updated",
    entityType: "service_line",
    entityId: serviceLine.id,
    scopeLevel: serviceLine.facility_id ? "facility" : "organization",
    facilityId: serviceLine.facility_id,
    metadata: {
      previous_code: existingServiceLine.code,
      code: serviceLine.code,
      name: serviceLine.name,
    },
  });

  return serviceLine;
}

export async function deleteServiceLine(serviceLineId: string) {
  const { currentUser, organizationId } = await requireOrganizationAdminContext();
  const adminClient = getSupabaseAdminClient();
  const serviceLine = await requireServiceLineInOrganization(serviceLineId, organizationId);
  await organizationRepository.deleteServiceLine(adminClient, serviceLineId);

  await safeLogAuditEvent({
    organizationId,
    actorUserId: currentUser.authUser.id,
    action: "service_line.deleted",
    entityType: "service_line",
    entityId: serviceLine.id,
    scopeLevel: serviceLine.facility_id ? "facility" : "organization",
    facilityId: serviceLine.facility_id,
    metadata: {
      code: serviceLine.code,
      name: serviceLine.name,
    },
  });
}

export async function getHierarchyManagementContext(limit = 50) {
  const { organizationId, organization } = await requireOrganizationAdminContext();
  const client = await getSupabaseServerClient();
  const [facilities, departments, serviceLines] = await Promise.all([
    organizationRepository.listFacilities(client, organizationId, limit),
    organizationRepository.listDepartments(client, organizationId, limit),
    organizationRepository.listServiceLines(client, organizationId, limit),
  ]);

  return {
    organization,
    facilities,
    departments,
    serviceLines,
  };
}
