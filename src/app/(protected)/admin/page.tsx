import type { ReactNode } from "react";

import type {
  Facility,
  OrganizationUserDirectoryEntry,
  Permission,
  Role,
  RolePermissionDirectoryEntry,
  ServiceLine,
  UserScopedDepartmentAssignment,
  UserScopedFacilityAssignment,
  UserScopedRoleAssignment,
} from "@/types";

import { PageHeader } from "@/components/ui/page-header";
import { getAdminOverview } from "@/features/admin/admin.service";
import {
  createDepartmentAction,
  createFacilityAction,
  createServiceLineAction,
  deleteServiceLineAction,
} from "@/features/hierarchy/hierarchy.actions";
import { getHierarchyManagementContext } from "@/features/hierarchy/hierarchy.service";
import {
  assignRolePermissionAction,
  createRoleAction,
  deleteRoleAction,
  removeRolePermissionAction,
  updateRoleAction,
} from "@/features/roles/role.actions";
import { listRoleCatalog } from "@/features/roles/role.service";
import {
  assignUserDepartmentAction,
  assignUserFacilityAction,
  assignUserRoleAction,
  inviteUserAction,
  reviewUserProfileAction,
  revokeUserDepartmentAction,
  revokeUserFacilityAction,
  revokeUserRoleAction,
} from "@/features/users/user.actions";
import { listOrganizationUsers } from "@/features/users/user.service";
import { requireModuleAccess } from "@/lib/auth/authorization";

const userStatusOptions = ["pending", "active", "inactive", "suspended"] as const;

type CollectionSectionProps = {
  eyebrow: string;
  title: string;
  description: string;
  emptyLabel: string;
  items: ReactNode[];
};

type AssignmentListProps = {
  eyebrow: string;
  title: string;
  emptyLabel: string;
  items: ReactNode[];
};

type UserDirectoryCardProps = {
  entry: OrganizationUserDirectoryEntry;
  roles: Role[];
  facilities: Facility[];
  departments: ReturnType<typeof listToOptionRecord>;
  serviceLines: ServiceLine[];
  facilityNameById: Map<string, string>;
};

type RoleCatalogCardProps = {
  entry: RolePermissionDirectoryEntry;
  availablePermissions: Permission[];
};

type AdminPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function titleCaseScope(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function listToOptionRecord(items: Array<{ id: string; name: string; facility_id: string }>) {
  return new Map(items.map((item) => [item.id, item] as const));
}

function CollectionSection({ eyebrow, title, description, emptyLabel, items }: CollectionSectionProps) {
  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2 className="section-title">{title}</h2>
        </div>
        <p className="section-copy">{description}</p>
      </div>

      {items.length > 0 ? <div className="resource-grid">{items}</div> : <p className="collection-empty">{emptyLabel}</p>}
    </section>
  );
}

function AssignmentList({ eyebrow, title, emptyLabel, items }: AssignmentListProps) {
  return (
    <div className="panel-stack">
      <div>
        <span className="resource-meta">{eyebrow}</span>
        <h3>{title}</h3>
      </div>
      {items.length > 0 ? <div className="signal-list">{items}</div> : <p className="collection-empty">{emptyLabel}</p>}
    </div>
  );
}

function PermissionPill({ permission }: { permission: Permission }) {
  return (
    <span className="pill">
      {permission.code}
    </span>
  );
}

function RoleCatalogCard({ entry, availablePermissions }: RoleCatalogCardProps) {
  const assignablePermissions = availablePermissions.filter(
    (permission) => !entry.permissions.some((assignedPermission) => assignedPermission.id === permission.id)
  );

  return (
    <article className="resource-card">
      <div className="panel-header">
        <div>
          <span className="resource-meta">{entry.role.is_system ? "System role" : "Custom role"}</span>
          <h3>{entry.role.name}</h3>
        </div>
        <span className={entry.canManage ? "pill primary" : "pill"}>{titleCaseScope(entry.role.scope_level)}</span>
      </div>

      <div className="meta-stack">
        <div className="meta-row">
          <span className="meta-row__label">Slug</span>
          <span className="meta-row__value">{entry.role.slug}</span>
        </div>
        <div className="meta-row">
          <span className="meta-row__label">Description</span>
          <span className="meta-row__value">{entry.role.description ?? "Not set"}</span>
        </div>
        <div className="meta-row">
          <span className="meta-row__label">Permission count</span>
          <span className="meta-row__value">{entry.permissions.length}</span>
        </div>
      </div>

      <div className="panel-stack">
        <div>
          <span className="resource-meta">Permissions</span>
          {entry.permissions.length > 0 ? (
            <div className="pill-row">
              {entry.permissions.map((permission) => (
                <div key={permission.id} className="signal-row">
                  <div className="signal-row__label">
                    <strong>{permission.code}</strong>
                    <span>
                      {permission.name} - {permission.feature_area}
                    </span>
                  </div>
                  {entry.canManage ? (
                    <form action={removeRolePermissionAction}>
                      <input type="hidden" name="roleId" value={entry.role.id} />
                      <input type="hidden" name="permissionId" value={permission.id} />
                      <button className="button button-secondary" type="submit">
                        Remove
                      </button>
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="collection-empty">No permissions assigned.</p>
          )}
        </div>

        {entry.canManage ? (
          <>
            <form action={updateRoleAction} className="form-stack">
              <input type="hidden" name="roleId" value={entry.role.id} />
              <div className="form-grid">
                <label className="field" htmlFor={`role-name-${entry.role.id}`}>
                  <span className="field-label">Role name</span>
                  <input id={`role-name-${entry.role.id}`} name="name" type="text" defaultValue={entry.role.name} required />
                </label>
                <label className="field" htmlFor={`role-slug-${entry.role.id}`}>
                  <span className="field-label">Role slug</span>
                  <input id={`role-slug-${entry.role.id}`} name="slug" type="text" defaultValue={entry.role.slug} required />
                </label>
                <label className="field" htmlFor={`role-scope-${entry.role.id}`}>
                  <span className="field-label">Scope</span>
                  <select id={`role-scope-${entry.role.id}`} name="scopeLevel" defaultValue={entry.role.scope_level}>
                    <option value="organization">Organization</option>
                    <option value="facility">Facility</option>
                    <option value="department">Department</option>
                    <option value="service_line">Service line</option>
                  </select>
                </label>
                <label className="field" htmlFor={`role-description-${entry.role.id}`}>
                  <span className="field-label">Description</span>
                  <input id={`role-description-${entry.role.id}`} name="description" type="text" defaultValue={entry.role.description ?? ""} />
                </label>
              </div>
              <div className="form-actions">
                <button className="button button-primary" type="submit">
                  Save role
                </button>
              </div>
            </form>

            <form action={assignRolePermissionAction} className="form-stack">
              <input type="hidden" name="roleId" value={entry.role.id} />
              <div className="form-grid">
                <label className="field" htmlFor={`role-permission-${entry.role.id}`}>
                  <span className="field-label">Add permission</span>
                  <select id={`role-permission-${entry.role.id}`} name="permissionId" defaultValue={assignablePermissions[0]?.id}>
                    {assignablePermissions.length > 0 ? (
                      assignablePermissions.map((permission) => (
                        <option key={permission.id} value={permission.id}>
                          {permission.code} - {permission.feature_area}
                        </option>
                      ))
                    ) : (
                      <option value="">No remaining permissions</option>
                    )}
                  </select>
                </label>
              </div>
              <div className="form-actions">
                <button className="button button-primary" type="submit" disabled={assignablePermissions.length === 0}>
                  Assign permission
                </button>
              </div>
            </form>

            <form action={deleteRoleAction}>
              <input type="hidden" name="roleId" value={entry.role.id} />
              <button className="button button-secondary" type="submit">
                Delete role
              </button>
            </form>
          </>
        ) : (
          <div className="surface-note">
            <strong>System-managed role</strong>
            Custom tenant roles can be edited here. Seeded system roles remain read-only.
          </div>
        )}
      </div>
    </article>
  );
}

function RoleAssignmentRow({ assignment }: { assignment: UserScopedRoleAssignment }) {
  const roleLabel = assignment.role?.name ?? "Unknown role";
  const scopeLabel = assignment.department
    ? `${assignment.department.name}${assignment.facility ? ` - ${assignment.facility.name}` : ""}`
    : assignment.serviceLine
      ? `${assignment.serviceLine.name}${assignment.facility ? ` - ${assignment.facility.name}` : ""}`
      : assignment.facility
        ? assignment.facility.name
        : "Organization";

  return (
    <div className="signal-row">
      <div className="signal-row__label">
        <strong>
          {roleLabel} - {titleCaseScope(assignment.assignment.scope_level)}
        </strong>
        <span>
          Scope: {scopeLabel}
          {assignment.assignment.ends_at ? ` - Ends ${new Date(assignment.assignment.ends_at).toLocaleDateString()}` : ""}
        </span>
      </div>
      <form action={revokeUserRoleAction}>
        <input type="hidden" name="assignmentId" value={assignment.assignment.id} />
        <button type="submit" className="button button-secondary">
          Remove
        </button>
      </form>
    </div>
  );
}

function FacilityAssignmentRow({ assignment }: { assignment: UserScopedFacilityAssignment }) {
  return (
    <div className="signal-row">
      <div className="signal-row__label">
        <strong>{assignment.facility?.name ?? "Unknown facility"}</strong>
        <span>
          {assignment.facility?.code ?? "No code"}
          {assignment.serviceLine ? ` - ${assignment.serviceLine.name}` : ""}
        </span>
      </div>
      <form action={revokeUserFacilityAction}>
        <input type="hidden" name="assignmentId" value={assignment.assignment.id} />
        <button type="submit" className="button button-secondary">
          Remove
        </button>
      </form>
    </div>
  );
}

function DepartmentAssignmentRow({ assignment }: { assignment: UserScopedDepartmentAssignment }) {
  return (
    <div className="signal-row">
      <div className="signal-row__label">
        <strong>{assignment.department?.name ?? "Unknown department"}</strong>
        <span>
          {assignment.department?.code ?? "No code"}
          {assignment.facility ? ` - ${assignment.facility.name}` : ""}
        </span>
      </div>
      <form action={revokeUserDepartmentAction}>
        <input type="hidden" name="assignmentId" value={assignment.assignment.id} />
        <button type="submit" className="button button-secondary">
          Remove
        </button>
      </form>
    </div>
  );
}

function UserDirectoryCard({ entry, roles, facilities, departments, serviceLines, facilityNameById }: UserDirectoryCardProps) {
  const userId = entry.profile.id;
  const roleSummary = entry.roles.map((role) => role.name).join(", ") || "No active roles assigned";

  return (
    <article className="resource-card">
      <div className="panel-header">
        <div>
          <span className="resource-meta">User profile</span>
          <h3>{entry.profile.full_name ?? entry.profile.work_email ?? "Unnamed profile"}</h3>
        </div>
        <span className={entry.profile.status === "active" ? "pill primary" : "pill"}>{entry.profile.status}</span>
      </div>

      <div className="meta-stack">
        <div className="meta-row">
          <span className="meta-row__label">Email</span>
          <span className="meta-row__value">{entry.profile.work_email ?? "Not recorded"}</span>
        </div>
        <div className="meta-row">
          <span className="meta-row__label">Title</span>
          <span className="meta-row__value">{entry.profile.title ?? "Not set"}</span>
        </div>
        <div className="meta-row">
          <span className="meta-row__label">Current roles</span>
          <span className="meta-row__value">{roleSummary}</span>
        </div>
      </div>

      <div className="panel-stack">
        <form action={reviewUserProfileAction} className="form-stack">
          <input type="hidden" name="userId" value={userId} />
          <div className="section-header">
            <div>
              <span className="eyebrow">Profile review</span>
              <h3 className="section-title">Update status and operator metadata</h3>
            </div>
          </div>
          <div className="form-grid">
            <label className="field" htmlFor={`fullName-${userId}`}>
              <span className="field-label">Full name</span>
              <input id={`fullName-${userId}`} name="fullName" type="text" defaultValue={entry.profile.full_name ?? ""} />
            </label>
            <label className="field" htmlFor={`title-${userId}`}>
              <span className="field-label">Title</span>
              <input id={`title-${userId}`} name="title" type="text" defaultValue={entry.profile.title ?? ""} />
            </label>
            <label className="field" htmlFor={`status-${userId}`}>
              <span className="field-label">Status</span>
              <select id={`status-${userId}`} name="status" defaultValue={entry.profile.status}>
                {userStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {titleCaseScope(status)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="button button-primary">
              Save profile
            </button>
          </div>
        </form>
        <AssignmentList
          eyebrow="Role assignments"
          title="Granted roles"
          emptyLabel="No role assignments yet."
          items={entry.scopedRoleAssignments.map((assignment) => (
            <RoleAssignmentRow key={assignment.assignment.id} assignment={assignment} />
          ))}
        />

        <form action={assignUserRoleAction} className="form-stack">
          <input type="hidden" name="userId" value={userId} />
          <div className="section-header">
            <div>
              <span className="eyebrow">Assign role</span>
              <h3 className="section-title">Add role access with scope</h3>
            </div>
            <p className="section-copy">
              Organization roles ignore scope fields. Facility roles use facility, department roles use department, and service-line
              roles use service line.
            </p>
          </div>
          <div className="form-grid">
            <label className="field" htmlFor={`roleId-${userId}`}>
              <span className="field-label">Role</span>
              <select id={`roleId-${userId}`} name="roleId" defaultValue={roles[0]?.id}>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} - {role.scope_level}
                  </option>
                ))}
              </select>
            </label>
            <label className="field" htmlFor={`facilityScope-${userId}`}>
              <span className="field-label">Facility scope</span>
              <select id={`facilityScope-${userId}`} name="facilityId" defaultValue="">
                <option value="">None</option>
                {facilities.map((facility) => (
                  <option key={facility.id} value={facility.id}>
                    {facility.name} - {facility.code}
                  </option>
                ))}
              </select>
            </label>
            <label className="field" htmlFor={`departmentScope-${userId}`}>
              <span className="field-label">Department scope</span>
              <select id={`departmentScope-${userId}`} name="departmentId" defaultValue="">
                <option value="">None</option>
                {[...departments.values()].map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name} - {facilityNameById.get(department.facility_id) ?? department.facility_id}
                  </option>
                ))}
              </select>
            </label>
            <label className="field" htmlFor={`serviceLineScope-${userId}`}>
              <span className="field-label">Service line scope</span>
              <select id={`serviceLineScope-${userId}`} name="serviceLineId" defaultValue="">
                <option value="">None</option>
                {serviceLines.map((serviceLine) => (
                  <option key={serviceLine.id} value={serviceLine.id}>
                    {serviceLine.name}
                    {serviceLine.facility_id ? ` - ${facilityNameById.get(serviceLine.facility_id) ?? serviceLine.facility_id}` : " - Org scope"}
                  </option>
                ))}
              </select>
            </label>
            <label className="field" htmlFor={`roleStartsAt-${userId}`}>
              <span className="field-label">Starts at</span>
              <input id={`roleStartsAt-${userId}`} name="startsAt" type="datetime-local" />
            </label>
            <label className="field" htmlFor={`roleEndsAt-${userId}`}>
              <span className="field-label">Ends at</span>
              <input id={`roleEndsAt-${userId}`} name="endsAt" type="datetime-local" />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="button button-primary">
              Add role assignment
            </button>
          </div>
        </form>

        <AssignmentList
          eyebrow="Facility access"
          title="Facility assignments"
          emptyLabel="No facilities assigned."
          items={entry.scopedFacilityAssignments.map((assignment) => (
            <FacilityAssignmentRow key={assignment.assignment.id} assignment={assignment} />
          ))}
        />

        <form action={assignUserFacilityAction} className="form-stack">
          <input type="hidden" name="userId" value={userId} />
          <div className="form-grid">
            <label className="field" htmlFor={`facilityAssignment-${userId}`}>
              <span className="field-label">Add facility access</span>
              <select id={`facilityAssignment-${userId}`} name="facilityId" defaultValue={facilities[0]?.id}>
                {facilities.map((facility) => (
                  <option key={facility.id} value={facility.id}>
                    {facility.name} - {facility.code}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="button button-primary">
              Assign facility
            </button>
          </div>
        </form>

        <AssignmentList
          eyebrow="Department access"
          title="Department assignments"
          emptyLabel="No departments assigned."
          items={entry.scopedDepartmentAssignments.map((assignment) => (
            <DepartmentAssignmentRow key={assignment.assignment.id} assignment={assignment} />
          ))}
        />

        <form action={assignUserDepartmentAction} className="form-stack">
          <input type="hidden" name="userId" value={userId} />
          <div className="form-grid">
            <label className="field" htmlFor={`departmentAssignment-${userId}`}>
              <span className="field-label">Add department access</span>
              <select id={`departmentAssignment-${userId}`} name="departmentId" defaultValue={[...departments.values()][0]?.id}>
                {[...departments.values()].map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name} - {facilityNameById.get(department.facility_id) ?? department.facility_id}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="button button-primary">
              Assign department
            </button>
          </div>
        </form>
      </div>
    </article>
  );
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  await requireModuleAccess("admin");
  const overview = await getAdminOverview({ previewLimit: 6 });
  const hierarchy = await getHierarchyManagementContext(50);
  const userDirectory = await listOrganizationUsers(50);
  const roleCatalog = await listRoleCatalog(50);
  const params = await searchParams;
  const message = getFirstParam(params.message);
  const error = getFirstParam(params.error);
  const invitableRoles = overview.roles.filter((role) => role.scope_level === "organization");
  const facilityNameById = new Map(hierarchy.facilities.map((facility) => [facility.id, facility.name]));
  const departmentMap = listToOptionRecord(hierarchy.departments);
  const serviceLineNameById = new Map(hierarchy.serviceLines.map((serviceLine) => [serviceLine.id, serviceLine.name]));
  const headerDescription = `Manage hierarchy, user access, service-line scoping, and operational controls for ${overview.organization?.name ?? "the current tenant"}.`;
  const currentUserName = overview.currentUser?.profile?.full_name ?? overview.currentUser?.authUser.email ?? "No active user session";
  const roleSummary = overview.roles.slice(0, 4).map((role) => role.name).join(", ") || "No roles available yet";
  const statCards = [
    { label: "Organizations", value: overview.counts.organizations, note: "Tenant records available to the current scope." },
    { label: "Facilities", value: overview.counts.facilities, note: "Operational sites configured for reporting and access." },
    { label: "Departments", value: overview.counts.departments, note: "Department-level scoping for hierarchy and analytics." },
    { label: "Service lines", value: hierarchy.serviceLines.length, note: "Cross-cutting operational categories ready for scoping." },
    { label: "Users", value: overview.counts.users, note: "Profiles currently attached to the tenant." },
    { label: "Role assignments", value: overview.counts.roleAssignments, note: "Live access bindings across active profiles." },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Control plane"
        title="Administration"
        description={headerDescription}
        action={<span className={overview.organization ? "pill primary" : "pill"}>{overview.organization?.name ?? "Tenant pending"}</span>}
      />

      {message ? <p className="form-message form-message--success">{message}</p> : null}
      {error ? <p className="form-message form-message--danger">{error}</p> : null}

      <section className="panel">
        <div className="section-header">
          <div>
            <span className="eyebrow">Workspace metrics</span>
            <h2 className="section-title">A live snapshot of the tenant control surface.</h2>
          </div>
          <p className="section-copy">
            Counts are resolved from organization, role, profile, hierarchy, and assignment tables through the current Supabase-backed
            repositories.
          </p>
        </div>

        <div className="stats-grid">
          {statCards.map((item) => (
            <article key={item.label} className="stat-card">
              <span className="stat-label">{item.label}</span>
              <p className="stat-value">{item.value}</p>
              <p>{item.note}</p>
            </article>
          ))}
        </div>
      </section>
      <div className="split-grid">
        <section className="panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">Tenant context</span>
              <h2 className="section-title">The control plane stays explicit about who and what is in scope.</h2>
            </div>
          </div>

          <div className="resource-grid">
            <article className="resource-card">
              <span className="resource-meta">Organization</span>
              <h3>{overview.organization?.name ?? "No organization assigned"}</h3>
              <div className="meta-stack">
                <div className="meta-row">
                  <span className="meta-row__label">Timezone</span>
                  <span className="meta-row__value">{overview.organization?.timezone ?? "Not set"}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-row__label">Status</span>
                  <span className="meta-row__value">{overview.organization?.status ?? "Unknown"}</span>
                </div>
              </div>
            </article>

            <article className="resource-card">
              <span className="resource-meta">Current user</span>
              <h3>{currentUserName}</h3>
              <div className="meta-stack">
                <div className="meta-row">
                  <span className="meta-row__label">Email</span>
                  <span className="meta-row__value">{overview.currentUser?.authUser.email ?? "Not available"}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-row__label">Role count</span>
                  <span className="meta-row__value">{overview.currentUser?.roles.length ?? 0}</span>
                </div>
              </div>
            </article>

            <article className="resource-card">
              <span className="resource-meta">Role catalog</span>
              <h3>{overview.roles.length} available</h3>
              <p>{roleSummary}</p>
            </article>
          </div>
        </section>

        <section className="panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">Invite workflow</span>
              <h2 className="section-title">Add users with an initial organization-scoped role.</h2>
            </div>
            <p className="section-copy">
              Invitations use Supabase Auth, then return the user into the correct tenant workspace after confirmation.
            </p>
          </div>

          {invitableRoles.length > 0 ? (
            <form action={inviteUserAction} className="form-stack">
              <div className="form-grid">
                <label className="field" htmlFor="fullName">
                  <span className="field-label">Full name</span>
                  <input id="fullName" name="fullName" type="text" placeholder="Avery Morgan" required />
                </label>

                <label className="field" htmlFor="email">
                  <span className="field-label">Email</span>
                  <input id="email" name="email" type="email" placeholder="avery@healthsystem.com" required />
                </label>

                <label className="field" htmlFor="title">
                  <span className="field-label">Title</span>
                  <input id="title" name="title" type="text" placeholder="Director of Finance" />
                </label>

                <label className="field" htmlFor="roleSlug">
                  <span className="field-label">Primary role</span>
                  <select id="roleSlug" name="roleSlug" defaultValue={invitableRoles[0]?.slug}>
                    {invitableRoles.map((role) => (
                      <option key={role.id} value={role.slug}>
                        {role.name} - {role.scope_level}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="surface-note">
                <strong>Invite behavior</strong>
                The invited user is created through the authenticated admin flow and pre-bound to the selected organization role.
              </div>

              <div className="form-actions">
                <button className="button button-primary" type="submit">
                  Send invitation
                </button>
              </div>
            </form>
          ) : (
            <p className="collection-empty">No organization-scoped roles are available yet. Add one before sending invitations.</p>
          )}
        </section>
      </div>

      <div className="split-grid">
        <section className="panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">Role setup</span>
              <h2 className="section-title">Create custom roles for tenant-specific workflows.</h2>
            </div>
            <p className="section-copy">
              Custom roles inherit the shared permission catalog but stay isolated to the current organization.
            </p>
          </div>

          <form action={createRoleAction} className="form-stack">
            <div className="form-grid">
              <label className="field" htmlFor="roleName">
                <span className="field-label">Role name</span>
                <input id="roleName" name="name" type="text" placeholder="Revenue Cycle Manager" required />
              </label>

              <label className="field" htmlFor="roleSlug">
                <span className="field-label">Role slug</span>
                <input id="roleSlug" name="slug" type="text" placeholder="revenue-cycle-manager" />
              </label>

              <label className="field" htmlFor="roleScopeLevel">
                <span className="field-label">Scope level</span>
                <select id="roleScopeLevel" name="scopeLevel" defaultValue="organization">
                  <option value="organization">Organization</option>
                  <option value="facility">Facility</option>
                  <option value="department">Department</option>
                  <option value="service_line">Service line</option>
                </select>
              </label>

              <label className="field" htmlFor="roleDescription">
                <span className="field-label">Description</span>
                <input id="roleDescription" name="description" type="text" placeholder="Access profile for revenue operations leaders" />
              </label>
            </div>

            <div className="surface-note">
              <strong>Permission model</strong>
              Permission codes are platform-managed. Tenant admins compose those permissions into custom roles here.
            </div>

            <div className="form-actions">
              <button className="button button-primary" type="submit">
                Create role
              </button>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">Permission catalog</span>
              <h2 className="section-title">The current workspace permissions available for role composition.</h2>
            </div>
          </div>

          <div className="pill-row">
            {roleCatalog.availablePermissions.map((permission) => (
              <PermissionPill key={permission.id} permission={permission} />
            ))}
          </div>
        </section>
      </div>

      <div className="split-grid">
        <section className="panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">Service line setup</span>
              <h2 className="section-title">Create service lines that can scope facilities, departments, and roles.</h2>
            </div>
          </div>

          <form action={createServiceLineAction} className="form-stack">
            <div className="form-grid">
              <label className="field" htmlFor="serviceLineFacilityId">
                <span className="field-label">Facility</span>
                <select id="serviceLineFacilityId" name="facilityId" defaultValue="">
                  <option value="">Organization-wide</option>
                  {hierarchy.facilities.map((facility) => (
                    <option key={facility.id} value={facility.id}>
                      {facility.name} - {facility.code}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field" htmlFor="serviceLineCode">
                <span className="field-label">Service line code</span>
                <input id="serviceLineCode" name="code" type="text" placeholder="CARD" required />
              </label>

              <label className="field" htmlFor="serviceLineName">
                <span className="field-label">Service line name</span>
                <input id="serviceLineName" name="name" type="text" placeholder="Cardiology" required />
              </label>

              <label className="field" htmlFor="serviceLineDescription">
                <span className="field-label">Description</span>
                <input id="serviceLineDescription" name="description" type="text" placeholder="Used across facilities and departmental scopes" />
              </label>
            </div>

            <input type="hidden" name="status" value="active" />

            <div className="form-actions">
              <button className="button button-primary" type="submit">
                Create service line
              </button>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">Facility setup</span>
              <h2 className="section-title">Create operational sites for hierarchy-aware access and reporting.</h2>
            </div>
          </div>

          <form action={createFacilityAction} className="form-stack">
            <div className="form-grid">
              <label className="field" htmlFor="facilityServiceLineId">
                <span className="field-label">Primary service line</span>
                <select id="facilityServiceLineId" name="serviceLineId" defaultValue="">
                  <option value="">None</option>
                  {hierarchy.serviceLines.map((serviceLine) => (
                    <option key={serviceLine.id} value={serviceLine.id}>
                      {serviceLine.name}
                      {serviceLine.facility_id ? ` - ${facilityNameById.get(serviceLine.facility_id) ?? serviceLine.facility_id}` : " - Org scope"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="facilityCode">
                <span className="field-label">Facility code</span>
                <input id="facilityCode" name="code" type="text" placeholder="NW-MAIN" required />
              </label>
              <label className="field" htmlFor="facilityName">
                <span className="field-label">Facility name</span>
                <input id="facilityName" name="name" type="text" placeholder="Northwind Main Campus" required />
              </label>
              <label className="field" htmlFor="facilityType">
                <span className="field-label">Facility type</span>
                <input id="facilityType" name="facilityType" type="text" placeholder="Hospital" />
              </label>
              <label className="field" htmlFor="facilityTimezone">
                <span className="field-label">Timezone</span>
                <input id="facilityTimezone" name="timezone" type="text" defaultValue={hierarchy.organization?.timezone ?? "UTC"} required />
              </label>
              <label className="field" htmlFor="city">
                <span className="field-label">City</span>
                <input id="city" name="city" type="text" placeholder="Chicago" />
              </label>
              <label className="field" htmlFor="stateRegion">
                <span className="field-label">State or region</span>
                <input id="stateRegion" name="stateRegion" type="text" placeholder="Illinois" />
              </label>
            </div>

            <input type="hidden" name="status" value="active" />

            <div className="form-actions">
              <button className="button button-primary" type="submit">
                Create facility
              </button>
            </div>
          </form>
        </section>
      </div>
      <section className="panel">
        <div className="section-header">
          <div>
            <span className="eyebrow">Department setup</span>
            <h2 className="section-title">Attach departments to facilities and optionally bind them to service lines.</h2>
          </div>
        </div>

        {hierarchy.facilities.length > 0 ? (
          <form action={createDepartmentAction} className="form-stack">
            <div className="form-grid">
              <label className="field" htmlFor="facilityId">
                <span className="field-label">Facility</span>
                <select id="facilityId" name="facilityId" defaultValue={hierarchy.facilities[0]?.id}>
                  {hierarchy.facilities.map((facility) => (
                    <option key={facility.id} value={facility.id}>
                      {facility.name} - {facility.code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="departmentServiceLineId">
                <span className="field-label">Service line</span>
                <select id="departmentServiceLineId" name="serviceLineId" defaultValue="">
                  <option value="">None</option>
                  {hierarchy.serviceLines.map((serviceLine) => (
                    <option key={serviceLine.id} value={serviceLine.id}>
                      {serviceLine.name}
                      {serviceLine.facility_id ? ` - ${facilityNameById.get(serviceLine.facility_id) ?? serviceLine.facility_id}` : " - Org scope"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="departmentCode">
                <span className="field-label">Department code</span>
                <input id="departmentCode" name="code" type="text" placeholder="CARD-OPS" required />
              </label>
              <label className="field" htmlFor="departmentName">
                <span className="field-label">Department name</span>
                <input id="departmentName" name="name" type="text" placeholder="Cardiology Operations" required />
              </label>
              <label className="field" htmlFor="departmentDescription">
                <span className="field-label">Description</span>
                <input id="departmentDescription" name="description" type="text" placeholder="Clinical and operational cardiology support" />
              </label>
              <label className="field" htmlFor="parentDepartmentId">
                <span className="field-label">Parent department</span>
                <select id="parentDepartmentId" name="parentDepartmentId" defaultValue="">
                  <option value="">None</option>
                  {hierarchy.departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name} - {facilityNameById.get(department.facility_id) ?? department.facility_id}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <input type="hidden" name="status" value="active" />

            <div className="form-actions">
              <button className="button button-primary" type="submit">
                Create department
              </button>
            </div>
          </form>
        ) : (
          <p className="collection-empty">Create at least one facility before adding departments.</p>
        )}
      </section>

      <CollectionSection
        eyebrow="Hierarchy"
        title="Service lines"
        description="Service lines can be organization-wide or tied to a facility. They are now available for hierarchy forms and scoped roles."
        emptyLabel="No service lines are configured yet."
        items={hierarchy.serviceLines.map((serviceLine) => (
          <article key={serviceLine.id} className="resource-card">
            <div className="panel-header">
              <div>
                <span className="resource-meta">Service line</span>
                <h3>{serviceLine.name}</h3>
              </div>
              <span className={serviceLine.status === "active" ? "pill primary" : "pill"}>{serviceLine.status}</span>
            </div>
            <div className="meta-stack">
              <div className="meta-row">
                <span className="meta-row__label">Code</span>
                <span className="meta-row__value">{serviceLine.code}</span>
              </div>
              <div className="meta-row">
                <span className="meta-row__label">Facility scope</span>
                <span className="meta-row__value">
                  {serviceLine.facility_id ? facilityNameById.get(serviceLine.facility_id) ?? serviceLine.facility_id : "Organization-wide"}
                </span>
              </div>
              <div className="meta-row">
                <span className="meta-row__label">Description</span>
                <span className="meta-row__value">{serviceLine.description ?? "Not set"}</span>
              </div>
            </div>
            <div className="form-actions">
              <form action={deleteServiceLineAction}>
                <input type="hidden" name="serviceLineId" value={serviceLine.id} />
                <button className="button button-secondary" type="submit">
                  Remove service line
                </button>
              </form>
            </div>
          </article>
        ))}
      />

      <CollectionSection
        eyebrow="Hierarchy"
        title="Facilities"
        description="Current facilities available to the tenant for reporting and scoped access."
        emptyLabel="No facilities are configured yet."
        items={hierarchy.facilities.map((facility) => (
          <article key={facility.id} className="resource-card">
            <div className="panel-header">
              <div>
                <span className="resource-meta">Facility</span>
                <h3>{facility.name}</h3>
              </div>
              <span className={facility.status === "active" ? "pill primary" : "pill"}>{facility.status}</span>
            </div>
            <div className="meta-stack">
              <div className="meta-row">
                <span className="meta-row__label">Code</span>
                <span className="meta-row__value">{facility.code}</span>
              </div>
              <div className="meta-row">
                <span className="meta-row__label">Type</span>
                <span className="meta-row__value">{facility.facility_type ?? "Not set"}</span>
              </div>
              <div className="meta-row">
                <span className="meta-row__label">Primary service line</span>
                <span className="meta-row__value">
                  {facility.service_line_id ? serviceLineNameById.get(facility.service_line_id) ?? facility.service_line_id : "None"}
                </span>
              </div>
            </div>
          </article>
        ))}
      />
      <CollectionSection
        eyebrow="Hierarchy"
        title="Departments"
        description="Department structure currently stored for the organization."
        emptyLabel="No departments are configured yet."
        items={hierarchy.departments.map((department) => (
          <article key={department.id} className="resource-card">
            <div className="panel-header">
              <div>
                <span className="resource-meta">Department</span>
                <h3>{department.name}</h3>
              </div>
              <span className={department.status === "active" ? "pill primary" : "pill"}>{department.status}</span>
            </div>
            <div className="meta-stack">
              <div className="meta-row">
                <span className="meta-row__label">Code</span>
                <span className="meta-row__value">{department.code}</span>
              </div>
              <div className="meta-row">
                <span className="meta-row__label">Facility</span>
                <span className="meta-row__value">{facilityNameById.get(department.facility_id) ?? department.facility_id}</span>
              </div>
              <div className="meta-row">
                <span className="meta-row__label">Service line</span>
                <span className="meta-row__value">
                  {department.service_line_id ? serviceLineNameById.get(department.service_line_id) ?? department.service_line_id : "None"}
                </span>
              </div>
            </div>
          </article>
        ))}
      />

      <CollectionSection
        eyebrow="Access"
        title="Role catalog"
        description="System roles remain visible for assignment. Custom tenant roles can be edited, assigned permissions, and removed here."
        emptyLabel="No roles are available for the current tenant."
        items={roleCatalog.roles.map((entry) => (
          <RoleCatalogCard key={entry.role.id} entry={entry} availablePermissions={roleCatalog.availablePermissions} />
        ))}
      />

      <CollectionSection
        eyebrow="Access"
        title="User directory"
        description="Profile review, scoped role assignment, facility access, and department access are now managed from a single tenant admin surface."
        emptyLabel="No user profiles are available for the current tenant."
        items={userDirectory.users.map((entry) => (
          <UserDirectoryCard
            key={entry.profile.id}
            entry={entry}
            roles={userDirectory.availableRoles}
            facilities={userDirectory.availableFacilities}
            departments={departmentMap}
            serviceLines={userDirectory.availableServiceLines}
            facilityNameById={facilityNameById}
          />
        ))}
      />
    </div>
  );
}
