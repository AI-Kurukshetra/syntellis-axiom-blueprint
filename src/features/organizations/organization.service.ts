import type { OrganizationBootstrapInput, TableInsert, UserProfile } from "@/types";

import { safeLogAuditEvent } from "@/lib/audit";
import { requireCurrentUserContext } from "@/lib/auth/current-user";
import { ForbiddenError, NotFoundError } from "@/lib/http-errors";
import { organizationRepository } from "@/lib/repositories/organization.repository";
import { profileRepository } from "@/lib/repositories/profile.repository";
import { roleRepository } from "@/lib/repositories/role.repository";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const systemAdministratorRoleSlug = "system-administrator";

function normalizeOptional(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function buildOrganizationSlug(name: string, providedSlug?: string) {
  const source = normalizeOptional(providedSlug) ?? name;
  const slug = source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 63);

  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Enter a valid organization slug using lowercase letters, numbers, and hyphens only.");
  }

  return slug;
}

function buildProfileUpsert(profile: UserProfile | null, userId: string, organizationId: string): TableInsert<"profiles"> {
  return {
    id: userId,
    organization_id: organizationId,
    full_name: profile?.full_name ?? null,
    work_email: profile?.work_email ?? null,
    title: profile?.title ?? null,
    status: profile?.status ?? "active",
    phone_number: profile?.phone_number ?? null,
    mfa_required: profile?.mfa_required ?? false,
    last_sign_in_at: profile?.last_sign_in_at ?? null,
    invited_by: profile?.invited_by ?? null,
    metadata: profile?.metadata ?? {},
  };
}

export async function listAccessibleOrganizations() {
  const currentUser = await requireCurrentUserContext();
  const client = await getSupabaseServerClient();
  const organizationId = currentUser.profile?.organization_id ?? null;

  return {
    organizations: organizationId ? await organizationRepository.listOrganizations(client, organizationId) : [],
    currentOrganizationId: organizationId,
    canBootstrapOrganization: currentUser.isBootstrapAdmin,
  };
}

export async function bootstrapOrganizationForCurrentUser(input: OrganizationBootstrapInput) {
  const currentUser = await requireCurrentUserContext();

  if (!currentUser.isBootstrapAdmin || currentUser.profile?.organization_id) {
    throw new ForbiddenError("Organization bootstrap is only available before a user has been assigned to a tenant.");
  }

  const adminClient = getSupabaseAdminClient();
  const slug = buildOrganizationSlug(input.name, input.slug);
  const existingOrganization = await organizationRepository.getOrganizationBySlug(adminClient, slug);

  if (existingOrganization) {
    throw new Error("Organization slug already exists. Choose a different slug.");
  }

  const organization = await organizationRepository.createOrganization(adminClient, {
    name: input.name.trim(),
    slug,
    legal_name: normalizeOptional(input.legalName) ?? null,
    timezone: input.timezone.trim(),
    contact_email: normalizeOptional(input.contactEmail) ?? currentUser.authUser.email ?? null,
    metadata: {
      bootstrap_completed_by: currentUser.authUser.id,
      bootstrap_completed_at: new Date().toISOString(),
    },
  });

  const systemAdministratorRole = await roleRepository.getRoleBySlug(adminClient, systemAdministratorRoleSlug);

  if (!systemAdministratorRole) {
    throw new NotFoundError("The system administrator role is not available in the current database.");
  }

  await profileRepository.upsertProfile(adminClient, buildProfileUpsert(currentUser.profile, currentUser.authUser.id, organization.id));

  await roleRepository.createUserRoleAssignment(adminClient, {
    organization_id: organization.id,
    user_id: currentUser.authUser.id,
    role_id: systemAdministratorRole.id,
    scope_level: "organization",
    facility_id: null,
    department_id: null,
    service_line_id: null,
    assigned_by: currentUser.authUser.id,
    starts_at: new Date().toISOString(),
    ends_at: null,
  });

  await safeLogAuditEvent({
    organizationId: organization.id,
    actorUserId: currentUser.authUser.id,
    action: "organization.bootstrap_completed",
    entityType: "organization",
    entityId: organization.id,
    scopeLevel: "organization",
    metadata: {
      slug: organization.slug,
      assigned_role_slug: systemAdministratorRole.slug,
    },
  });

  return organization;
}
