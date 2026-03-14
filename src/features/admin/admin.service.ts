import type { AdminOverview } from "@/types";

import { requireAdminAccess } from "@/lib/auth/authorization";
import { organizationRepository } from "@/lib/repositories/organization.repository";
import { profileRepository } from "@/lib/repositories/profile.repository";
import { roleRepository } from "@/lib/repositories/role.repository";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

type AdminOverviewOptions = {
  previewLimit?: number;
};

export async function getAdminOverview(options: AdminOverviewOptions = {}): Promise<AdminOverview> {
  const client = await getSupabaseServerClient();
  const currentUser = await requireAdminAccess();
  const organizationId = currentUser?.profile?.organization_id ?? null;
  const previewLimit = options.previewLimit ?? 8;

  const [organizationCount, userCount, roles, roleAssignmentCount, facilityCount, departmentCount, facilities, departments, serviceLines, users] =
    await Promise.all([
    organizationRepository.countOrganizations(client, organizationId),
    profileRepository.countProfiles(client, organizationId),
    roleRepository.listRoles(client, organizationId),
    roleRepository.countRoleAssignments(client, organizationId),
    organizationId ? organizationRepository.countFacilities(client, organizationId) : Promise.resolve(0),
    organizationId ? organizationRepository.countDepartments(client, organizationId) : Promise.resolve(0),
    organizationId ? organizationRepository.listFacilities(client, organizationId, previewLimit) : Promise.resolve([]),
    organizationId ? organizationRepository.listDepartments(client, organizationId, previewLimit) : Promise.resolve([]),
    organizationId ? organizationRepository.listServiceLines(client, organizationId, previewLimit) : Promise.resolve([]),
    organizationId ? profileRepository.listProfilesByOrganization(client, organizationId, previewLimit) : Promise.resolve([]),
  ]);

  return {
    currentUser,
    organization: currentUser?.organization ?? null,
    counts: {
      organizations: organizationCount,
      facilities: facilityCount,
      departments: departmentCount,
      users: userCount,
      roles: roles.length,
      roleAssignments: roleAssignmentCount,
    },
    roles,
    facilities,
    departments,
    serviceLines,
    users,
  };
}
