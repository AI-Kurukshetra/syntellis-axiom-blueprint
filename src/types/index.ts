import type { User } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type { Database, Json } from "@/types/database";

export type ModuleKey =
  | "dashboard"
  | "analytics"
  | "reports"
  | "alerts"
  | "compliance"
  | "integrations"
  | "benchmarks"
  | "admin";

export type PublicSchema = Database["public"];
export type TableName = keyof PublicSchema["Tables"];
export type TableRow<T extends TableName> = PublicSchema["Tables"][T]["Row"];
export type TableInsert<T extends TableName> = PublicSchema["Tables"][T]["Insert"];
export type TableUpdate<T extends TableName> = PublicSchema["Tables"][T]["Update"];
export type AppEnum<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

export type OrganizationStatus = AppEnum<"organization_status">;
export type UserAccountStatus = AppEnum<"user_account_status">;
export type ScopeLevel = AppEnum<"scope_level">;
export type DataSourceType = AppEnum<"data_source_type">;
export type AlertSeverity = AppEnum<"alert_severity">;
export type AlertState = AppEnum<"alert_state">;
export type AssetVisibility = AppEnum<"asset_visibility">;
export type ReportFormat = AppEnum<"report_format">;
export type MetricValueStatus = AppEnum<"metric_value_status">;
export type BenchmarkSourceType = AppEnum<"benchmark_source_type">;

export type Organization = TableRow<"organizations">;
export type ServiceLine = TableRow<"service_lines">;
export type Facility = TableRow<"facilities">;
export type Department = TableRow<"departments">;
export type Role = TableRow<"roles">;
export type Permission = TableRow<"permissions">;
export type RolePermission = TableRow<"role_permissions">;
export type UserProfile = TableRow<"profiles">;
export type UserRoleAssignment = TableRow<"user_role_assignments">;
export type UserFacilityAssignment = TableRow<"user_facility_assignments">;
export type UserDepartmentAssignment = TableRow<"user_department_assignments">;
export type Patient = TableRow<"patients">;
export type ClinicalEncounter = TableRow<"clinical_encounters">;
export type FinancialTransaction = TableRow<"financial_transactions">;
export type BudgetItem = TableRow<"budget_items">;
export type KpiDefinition = TableRow<"kpi_definitions">;
export type Metric = TableRow<"metrics">;
export type MetricValue = TableRow<"metric_values">;
export type Dashboard = TableRow<"dashboards">;
export type Report = TableRow<"reports">;
export type DataSource = TableRow<"data_sources">;
export type Alert = TableRow<"alerts">;
export type AuditLog = TableRow<"audit_logs">;
export type Benchmark = TableRow<"benchmarks">;
export type Target = TableRow<"targets">;
export type PermissionCode = Permission["code"];

export interface CurrentUserContext {
  authUser: User;
  profile: UserProfile | null;
  organization: Organization | null;
  roleAssignments: UserRoleAssignment[];
  roles: Role[];
  permissions: Permission[];
  permissionCodes: PermissionCode[];
  facilityAssignments: UserFacilityAssignment[];
  departmentAssignments: UserDepartmentAssignment[];
  isBootstrapAdmin: boolean;
  canManageAdministration: boolean;
}

export interface AdminOverview {
  currentUser: CurrentUserContext | null;
  organization: Organization | null;
  counts: {
    organizations: number;
    facilities: number;
    departments: number;
    users: number;
    roles: number;
    roleAssignments: number;
  };
  roles: Role[];
  facilities: Facility[];
  departments: Department[];
  serviceLines: ServiceLine[];
  users: UserProfile[];
}

export interface AppModuleDefinition {
  key: ModuleKey;
  label: string;
  description: string;
  href: string;
  readiness: "planned" | "scaffolded" | "implemented";
}

export interface OrganizationBootstrapInput {
  name: string;
  slug?: string | undefined;
  legalName?: string | undefined;
  timezone: string;
  contactEmail?: string | undefined;
}

export interface UserInviteInput {
  email: string;
  fullName: string;
  title?: string | undefined;
  roleSlug: string;
}

export interface UserScopedRoleAssignment {
  assignment: UserRoleAssignment;
  role: Role | null;
  facility: Facility | null;
  department: Department | null;
  serviceLine: ServiceLine | null;
}

export interface UserScopedFacilityAssignment {
  assignment: UserFacilityAssignment;
  facility: Facility | null;
  serviceLine: ServiceLine | null;
}

export interface UserScopedDepartmentAssignment {
  assignment: UserDepartmentAssignment;
  department: Department | null;
  facility: Facility | null;
  serviceLine: ServiceLine | null;
}

export interface OrganizationUserDirectoryEntry {
  profile: UserProfile;
  roles: Role[];
  roleAssignments: UserRoleAssignment[];
  scopedRoleAssignments: UserScopedRoleAssignment[];
  facilityAssignments: UserFacilityAssignment[];
  scopedFacilityAssignments: UserScopedFacilityAssignment[];
  departmentAssignments: UserDepartmentAssignment[];
  scopedDepartmentAssignments: UserScopedDepartmentAssignment[];
}

export interface OrganizationUserDirectory {
  organization: Organization | null;
  availableRoles: Role[];
  availableFacilities: Facility[];
  availableDepartments: Department[];
  availableServiceLines: ServiceLine[];
  users: OrganizationUserDirectoryEntry[];
}

export interface UserInvitationResult {
  userId: string;
  email: string;
  organizationId: string;
  role: Role;
  invitationSentAt: string;
}

export interface RoleInput {
  name: string;
  slug?: string | undefined;
  description?: string | undefined;
  scopeLevel: Exclude<ScopeLevel, "global">;
}

export interface RolePermissionAssignmentInput {
  roleId: string;
  permissionId: string;
}

export interface RolePermissionDirectoryEntry {
  role: Role;
  permissions: Permission[];
  rolePermissions: RolePermission[];
  canManage: boolean;
}

export interface RoleCatalog {
  organization: Organization | null;
  availablePermissions: Permission[];
  roles: RolePermissionDirectoryEntry[];
}

export interface FacilityInput {
  serviceLineId?: string | undefined;
  code: string;
  name: string;
  facilityType?: string | undefined;
  timezone: string;
  status?: OrganizationStatus | undefined;
  addressLine1?: string | undefined;
  addressLine2?: string | undefined;
  city?: string | undefined;
  stateRegion?: string | undefined;
  postalCode?: string | undefined;
  countryCode?: string | undefined;
  effectiveFrom?: string | undefined;
  effectiveTo?: string | undefined;
}

export interface DepartmentInput {
  facilityId: string;
  serviceLineId?: string | undefined;
  code: string;
  name: string;
  description?: string | undefined;
  status?: OrganizationStatus | undefined;
  parentDepartmentId?: string | undefined;
  effectiveFrom?: string | undefined;
  effectiveTo?: string | undefined;
}

export interface ServiceLineInput {
  facilityId?: string | undefined;
  code: string;
  name: string;
  description?: string | undefined;
  status?: OrganizationStatus | undefined;
  effectiveFrom?: string | undefined;
  effectiveTo?: string | undefined;
}

export interface UserProfileReviewInput {
  userId: string;
  fullName?: string | undefined;
  title?: string | undefined;
  status?: UserAccountStatus | undefined;
}

export interface UserRoleAssignmentInput {
  userId: string;
  roleId: string;
  facilityId?: string | undefined;
  departmentId?: string | undefined;
  serviceLineId?: string | undefined;
  startsAt?: string | undefined;
  endsAt?: string | undefined;
}

export interface UserFacilityAssignmentInput {
  userId: string;
  facilityId: string;
}

export interface UserDepartmentAssignmentInput {
  userId: string;
  departmentId: string;
}
