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
export type DashboardWidget = TableRow<"dashboard_widgets">;
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

export interface OrganizationSettingsInput {
  name: string;
  legalName?: string | undefined;
  timezone: string;
  contactEmail?: string | undefined;
  status?: OrganizationStatus | undefined;
  effectiveFrom?: string | undefined;
  effectiveTo?: string | undefined;
  auditRetentionDays?: number | undefined;
  reportRetentionDays?: number | undefined;
  defaultNotificationEmail?: string | undefined;
  digestNotificationsEnabled?: boolean | undefined;
  alertEscalationEnabled?: boolean | undefined;
  dashboardRefreshIntervalMinutes?: number | undefined;
  nightlySyncHourUtc?: number | undefined;
  reportScheduleHourUtc?: number | undefined;
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

export interface KpiDefinitionInput {
  code: string;
  name: string;
  domain: string;
  description?: string | undefined;
  formulaExpression: string;
  numeratorLabel?: string | undefined;
  denominatorLabel?: string | undefined;
  unitOfMeasure?: string | undefined;
  aggregationGrain?: string | undefined;
  benchmarkDefinition?: string | undefined;
  targetDefinition?: string | undefined;
  version?: number | undefined;
  effectiveFrom?: string | undefined;
  effectiveTo?: string | undefined;
  isActive?: boolean | undefined;
}

export interface KpiCatalog {
  organization: Organization | null;
  canManage: boolean;
  definitions: KpiDefinition[];
}

export interface MetricInput {
  kpiDefinitionId?: string | undefined;
  code: string;
  name: string;
  domain: string;
  description?: string | undefined;
  metricType: string;
  valueDataType: string;
  dimensionsSchema?: string | undefined;
  isActive?: boolean | undefined;
}

export interface MetricCatalog {
  organization: Organization | null;
  canManage: boolean;
  metrics: Metric[];
  kpiDefinitions: KpiDefinition[];
}

export interface KpiVersionResult {
  source: KpiDefinition;
  version: KpiDefinition;
}

export interface BenchmarkInput {
  metricId?: string | undefined;
  kpiDefinitionId?: string | undefined;
  name: string;
  sourceType?: BenchmarkSourceType | undefined;
  domain: string;
  comparisonMethod?: string | undefined;
  valueNumeric?: number | undefined;
  valueJson?: string | undefined;
  sourceReference?: string | undefined;
  benchmarkStart?: string | undefined;
  benchmarkEnd?: string | undefined;
  version?: number | undefined;
}

export interface TargetInput {
  metricId?: string | undefined;
  kpiDefinitionId?: string | undefined;
  scopeLevel?: ScopeLevel | undefined;
  facilityId?: string | undefined;
  departmentId?: string | undefined;
  serviceLineId?: string | undefined;
  periodStart: string;
  periodEnd: string;
  targetValue: number;
  tolerancePercent?: number | undefined;
  notes?: string | undefined;
}

export interface MetricValuePublishInput {
  metricId: string;
  facilityId?: string | undefined;
  departmentId?: string | undefined;
  serviceLineId?: string | undefined;
  ingestionJobId?: string | undefined;
  periodStart?: string | undefined;
  periodEnd?: string | undefined;
  asOfDate: string;
  valueNumeric?: number | undefined;
  valueText?: string | undefined;
  valueJson?: string | undefined;
  status?: MetricValueStatus | undefined;
  lineage?: string | undefined;
}

export interface MetricValueQueryInput {
  limit?: number | undefined;
  facilityId?: string | undefined;
  departmentId?: string | undefined;
  serviceLineId?: string | undefined;
  status?: MetricValueStatus | "all" | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
}

export interface PublishedMetricValueRecord {
  metricValue: MetricValue;
  metric: Metric | null;
  kpiDefinition: KpiDefinition | null;
  target: Target | null;
  benchmark: Benchmark | null;
  freshness: "fresh" | "warning" | "stale";
}

export interface MetricValueCatalog {
  organization: Organization | null;
  canManage: boolean;
  values: PublishedMetricValueRecord[];
}

export interface DashboardFiltersInput {
  dashboardSlug?: string | undefined;
  facilityId?: string | undefined;
  departmentId?: string | undefined;
  serviceLineId?: string | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  status?: MetricValueStatus | "all" | undefined;
}

export interface DashboardWidgetInput {
  metricId: string;
  title?: string | undefined;
  widgetType?: string | undefined;
}

export interface DashboardWidgetView {
  widget: DashboardWidget;
  metric: Metric | null;
  latestValue: PublishedMetricValueRecord | null;
  trend: PublishedMetricValueRecord[];
}

export interface DashboardSummaryCard {
  metric: Metric;
  kpiDefinition: KpiDefinition | null;
  latestValue: PublishedMetricValueRecord | null;
  variance: number | null;
  trendDirection: "up" | "down" | "flat";
}

export interface DashboardWorkspace {
  organization: Organization | null;
  dashboards: Dashboard[];
  dashboard: Dashboard;
  summaryCards: DashboardSummaryCard[];
  widgets: DashboardWidgetView[];
  values: PublishedMetricValueRecord[];
  availableMetrics: Metric[];
  facilities: Facility[];
  departments: Department[];
  serviceLines: ServiceLine[];
  filters: Required<DashboardFiltersInput>;
  staleWidgetCount: number;
  lastRefreshedAt: string | null;
}

export type AnalyticsDomainKey = "financial" | "operations" | "clinical_quality" | "revenue_cycle";

export interface DomainAnalyticsFiltersInput {
  domainTab?: AnalyticsDomainKey | undefined;
  facilityId?: string | undefined;
  departmentId?: string | undefined;
  serviceLineId?: string | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  compareBy?: "organization" | "facility" | "department" | "service_line" | undefined;
  savedView?: string | undefined;
}

export interface DomainAnalyticsSummaryCard {
  metric: Metric;
  latestValue: PublishedMetricValueRecord | null;
  trend: PublishedMetricValueRecord[];
}

export interface DomainAnalyticsComparisonRow {
  scopeKey: string;
  scopeLabel: string;
  latestValue: PublishedMetricValueRecord | null;
  variance: number | null;
}

export interface DomainAnalyticsWorkspace {
  organization: Organization | null;
  activeDomain: AnalyticsDomainKey;
  filters: Required<DomainAnalyticsFiltersInput>;
  facilities: Facility[];
  departments: Department[];
  serviceLines: ServiceLine[];
  summaryCards: DomainAnalyticsSummaryCard[];
  comparisonRows: DomainAnalyticsComparisonRow[];
  detailRows: PublishedMetricValueRecord[];
  rawCounts: {
    financialTransactions: number;
    budgetItems: number;
    clinicalEncounters: number;
  };
  savedViews: Array<{
    key: string;
    label: string;
    description: string;
    filters: Partial<Required<DomainAnalyticsFiltersInput>>;
  }>;
}

export interface AnalyticsScopeCatalog {
  organization: Organization | null;
  facilities: Facility[];
  departments: Department[];
  serviceLines: ServiceLine[];
}

export interface AuditLogQueryInput {
  limit?: number | undefined;
  page?: number | undefined;
  actorUserId?: string | undefined;
  action?: string | undefined;
  entityType?: string | undefined;
  facilityId?: string | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
}

export interface AuditLogCatalog {
  organization: Organization | null;
  canManage: boolean;
  logs: AuditLog[];
  totalCount: number;
  totalPages: number;
  users: UserProfile[];
  facilities: Facility[];
  actions: string[];
  entityTypes: string[];
  templates: Array<{
    key: string;
    label: string;
    description: string;
    filters: Partial<Required<AuditLogQueryInput>>;
  }>;
  filters: Required<AuditLogQueryInput>;
}

export interface BenchmarkCatalog {
  organization: Organization | null;
  canManage: boolean;
  benchmarks: Benchmark[];
}

export interface TargetCatalog {
  organization: Organization | null;
  canManage: boolean;
  targets: Target[];
}

export interface ReportInput {
  name: string;
  slug?: string | undefined;
  description?: string | undefined;
  visibility?: AssetVisibility | undefined;
  domain?: string | undefined;
  metricIds?: string[] | undefined;
  facilityId?: string | undefined;
  departmentId?: string | undefined;
  serviceLineId?: string | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  status?: MetricValueStatus | "all" | undefined;
  columns?: string[] | undefined;
}

export interface ReportScheduleInput {
  reportId: string;
  frequency: AppEnum<"schedule_frequency">;
  format: ReportFormat;
  recipientUserIds: string[];
  deliveryChannels?: AppEnum<"notification_channel">[] | undefined;
  cronExpression?: string | undefined;
  isActive?: boolean | undefined;
}

export interface ReportRunInput {
  reportId: string;
  format: ReportFormat;
}

export interface ReportQueryInput {
  reportSlug?: string | undefined;
}

export interface ReportDatasetRow {
  asOfDate: string;
  periodStart: string | null;
  periodEnd: string | null;
  metricCode: string;
  metricName: string;
  domain: string;
  facilityName: string | null;
  departmentName: string | null;
  serviceLineName: string | null;
  status: MetricValueStatus;
  value: string;
  targetValue: string;
  benchmarkValue: string;
  varianceValue: string;
  freshness: "fresh" | "warning" | "stale";
}

export interface ReportScheduleView {
  schedule: TableRow<"report_schedules">;
  recipients: UserProfile[];
}

export interface ReportRunView {
  run: TableRow<"report_runs">;
  triggeredBy: UserProfile | null;
}

export interface ReportWorkspace {
  organization: Organization | null;
  reports: Report[];
  activeReport: Report | null;
  datasetRows: ReportDatasetRow[];
  schedules: ReportScheduleView[];
  runs: ReportRunView[];
  availableMetrics: Metric[];
  availableUsers: UserProfile[];
  facilities: Facility[];
  departments: Department[];
  serviceLines: ServiceLine[];
  filters: Required<ReportQueryInput>;
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
