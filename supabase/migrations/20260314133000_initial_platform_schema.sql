begin;

create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.organization_status as enum ('draft', 'active', 'inactive');
create type public.user_account_status as enum ('pending', 'active', 'inactive', 'suspended');
create type public.scope_level as enum ('global', 'organization', 'facility', 'department', 'service_line');
create type public.data_source_type as enum ('api', 'database', 'flat_file', 'scheduled_import', 'fhir', 'hl7', 'sftp');
create type public.connection_status as enum ('pending', 'connected', 'failed', 'disabled');
create type public.job_status as enum ('queued', 'running', 'succeeded', 'failed', 'cancelled', 'partial');
create type public.metric_value_status as enum ('draft', 'published', 'superseded');
create type public.asset_visibility as enum ('private', 'shared', 'role_based');
create type public.report_format as enum ('pdf', 'csv', 'xlsx');
create type public.alert_severity as enum ('info', 'warning', 'critical');
create type public.alert_state as enum ('new', 'acknowledged', 'resolved', 'dismissed', 'closed');
create type public.notification_channel as enum ('in_app', 'email', 'sms', 'webhook');
create type public.notification_status as enum ('pending', 'sent', 'delivered', 'failed', 'read');
create type public.data_quality_severity as enum ('info', 'warning', 'error', 'critical');
create type public.audit_actor_type as enum ('user', 'service', 'system');
create type public.benchmark_source_type as enum ('internal', 'external', 'licensed', 'customer_provided');
create type public.schedule_frequency as enum ('once', 'hourly', 'daily', 'weekly', 'monthly', 'quarterly');
create type public.prediction_type as enum ('forecast', 'anomaly', 'insight', 'classification', 'regression');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug citext not null unique,
  legal_name text,
  status public.organization_status not null default 'draft',
  timezone text not null default 'UTC',
  contact_email citext,
  metadata jsonb not null default '{}'::jsonb,
  effective_from date,
  effective_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid,
  code text not null,
  name text not null,
  description text,
  status public.organization_status not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  effective_from date,
  effective_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.facilities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_line_id uuid references public.service_lines(id) on delete set null,
  code text not null,
  name text not null,
  facility_type text,
  status public.organization_status not null default 'active',
  timezone text not null default 'UTC',
  address_line_1 text,
  address_line_2 text,
  city text,
  state_region text,
  postal_code text,
  country_code text,
  metadata jsonb not null default '{}'::jsonb,
  effective_from date,
  effective_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

alter table public.service_lines
  add constraint service_lines_facility_fk
  foreign key (facility_id)
  references public.facilities(id)
  on delete set null;

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid not null references public.facilities(id) on delete cascade,
  service_line_id uuid references public.service_lines(id) on delete set null,
  parent_department_id uuid references public.departments(id) on delete set null,
  code text not null,
  name text not null,
  description text,
  status public.organization_status not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  effective_from date,
  effective_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (facility_id, code)
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  slug citext not null,
  description text,
  scope_level public.scope_level not null default 'organization',
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index roles_global_slug_uidx on public.roles (slug) where organization_id is null;
create unique index roles_org_slug_uidx on public.roles (organization_id, slug) where organization_id is not null;

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  code citext not null unique,
  name text not null,
  feature_area text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  full_name text,
  work_email citext unique,
  title text,
  status public.user_account_status not null default 'active',
  phone_number text,
  mfa_required boolean not null default false,
  last_sign_in_at timestamptz,
  invited_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_role_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  scope_level public.scope_level not null default 'organization',
  facility_id uuid references public.facilities(id) on delete cascade,
  department_id uuid references public.departments(id) on delete cascade,
  service_line_id uuid references public.service_lines(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.user_facility_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  facility_id uuid not null references public.facilities(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, facility_id)
);

create table public.user_department_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  department_id uuid not null references public.departments(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, department_id)
);

create table public.data_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  source_type public.data_source_type not null,
  vendor_name text,
  description text,
  connection_status public.connection_status not null default 'pending',
  credential_reference text,
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  last_synced_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.integration_configurations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  data_source_id uuid not null references public.data_sources(id) on delete cascade,
  version integer not null default 1,
  frequency public.schedule_frequency not null default 'daily',
  cron_expression text,
  validation_config jsonb not null default '{}'::jsonb,
  error_handling_config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  last_tested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (data_source_id, version)
);

create table public.source_field_mappings (
  id uuid primary key default gen_random_uuid(),
  integration_configuration_id uuid not null references public.integration_configurations(id) on delete cascade,
  source_entity text not null,
  source_field text not null,
  target_table text not null,
  target_column text not null,
  transform_expression text,
  is_required boolean not null default false,
  created_at timestamptz not null default now(),
  unique (integration_configuration_id, source_entity, source_field, target_table, target_column)
);

create table public.ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  data_source_id uuid not null references public.data_sources(id) on delete cascade,
  integration_configuration_id uuid references public.integration_configurations(id) on delete set null,
  job_type text not null,
  status public.job_status not null default 'queued',
  triggered_by uuid references public.profiles(id) on delete set null,
  started_at timestamptz,
  finished_at timestamptz,
  published_at timestamptz,
  processing_window_start timestamptz,
  processing_window_end timestamptz,
  rows_received integer not null default 0,
  rows_processed integer not null default 0,
  rows_rejected integer not null default 0,
  error_details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.data_quality_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  target_table text not null,
  rule_type text not null,
  severity public.data_quality_severity not null default 'warning',
  rule_definition jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name, target_table)
);

create table public.data_quality_issues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rule_id uuid not null references public.data_quality_rules(id) on delete cascade,
  ingestion_job_id uuid references public.ingestion_jobs(id) on delete set null,
  affected_table text not null,
  record_primary_key text,
  severity public.data_quality_severity not null,
  issue_status text not null default 'open',
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  details jsonb not null default '{}'::jsonb
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  primary_facility_id uuid references public.facilities(id) on delete set null,
  patient_identifier text not null,
  medical_record_number text,
  first_name text,
  last_name text,
  date_of_birth date,
  sex text,
  gender_identity text,
  source_system text,
  source_record_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, patient_identifier)
);

create table public.clinical_encounters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  facility_id uuid references public.facilities(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  encounter_number text not null,
  encounter_type text not null,
  status text,
  admission_at timestamptz,
  discharge_at timestamptz,
  attending_provider text,
  diagnosis_codes text[] not null default array[]::text[],
  procedure_codes text[] not null default array[]::text[],
  source_system text,
  source_record_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, encounter_number)
);

create table public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete set null,
  encounter_id uuid references public.clinical_encounters(id) on delete set null,
  facility_id uuid references public.facilities(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  transaction_type text not null,
  transaction_date date not null,
  posting_date date,
  account_code text,
  account_name text,
  payer_name text,
  amount numeric(18,2) not null,
  currency_code text not null default 'USD',
  revenue_code text,
  status text,
  source_system text,
  source_record_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.budget_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid references public.facilities(id) on delete cascade,
  department_id uuid references public.departments(id) on delete cascade,
  service_line_id uuid references public.service_lines(id) on delete cascade,
  fiscal_year integer not null,
  fiscal_period integer,
  scenario_name text not null default 'budget',
  account_code text not null,
  account_name text,
  amount numeric(18,2) not null,
  source_system text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.kpi_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  domain text not null,
  description text,
  formula_expression text not null,
  numerator_label text,
  denominator_label text,
  unit_of_measure text,
  aggregation_grain text,
  benchmark_definition jsonb not null default '{}'::jsonb,
  target_definition jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  effective_from date,
  effective_to date,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code, version)
);

create table public.metrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kpi_definition_id uuid references public.kpi_definitions(id) on delete set null,
  code text not null,
  name text not null,
  domain text not null,
  description text,
  metric_type text not null,
  value_data_type text not null default 'numeric',
  dimensions_schema jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.metric_values (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  metric_id uuid not null references public.metrics(id) on delete cascade,
  kpi_definition_id uuid references public.kpi_definitions(id) on delete set null,
  facility_id uuid references public.facilities(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  service_line_id uuid references public.service_lines(id) on delete set null,
  ingestion_job_id uuid references public.ingestion_jobs(id) on delete set null,
  period_start date,
  period_end date,
  as_of_date date not null,
  value_numeric numeric(20,4),
  value_text text,
  value_json jsonb,
  target_value numeric(20,4),
  benchmark_value numeric(20,4),
  variance_value numeric(20,4),
  status public.metric_value_status not null default 'published',
  lineage jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.dashboards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_user_id uuid references public.profiles(id) on delete set null,
  audience_role_id uuid references public.roles(id) on delete set null,
  name text not null,
  slug citext not null,
  description text,
  visibility public.asset_visibility not null default 'private',
  is_default boolean not null default false,
  filters_config jsonb not null default '{}'::jsonb,
  layout_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  slug citext not null,
  description text,
  visibility public.asset_visibility not null default 'private',
  definition jsonb not null default '{}'::jsonb,
  dataset_config jsonb not null default '{}'::jsonb,
  visualization_config jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table public.dashboard_widgets (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.dashboards(id) on delete cascade,
  metric_id uuid references public.metrics(id) on delete set null,
  report_id uuid references public.reports(id) on delete set null,
  title text not null,
  widget_type text not null,
  position_x integer not null default 0,
  position_y integer not null default 0,
  width integer not null default 4,
  height integer not null default 3,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.report_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  report_id uuid not null references public.reports(id) on delete cascade,
  frequency public.schedule_frequency not null default 'weekly',
  cron_expression text,
  delivery_channels public.notification_channel[] not null default array['email'::public.notification_channel],
  recipient_config jsonb not null default '{}'::jsonb,
  format public.report_format not null default 'pdf',
  is_active boolean not null default true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.report_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  report_id uuid not null references public.reports(id) on delete cascade,
  report_schedule_id uuid references public.report_schedules(id) on delete set null,
  triggered_by uuid references public.profiles(id) on delete set null,
  format public.report_format not null default 'pdf',
  status public.job_status not null default 'queued',
  started_at timestamptz,
  completed_at timestamptz,
  output_path text,
  row_count integer,
  error_details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.scheduled_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  job_category text not null,
  job_name text not null,
  related_entity_type text,
  related_entity_id uuid,
  frequency public.schedule_frequency not null,
  cron_expression text,
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, job_category, job_name)
);

create table public.benchmarks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  metric_id uuid references public.metrics(id) on delete set null,
  kpi_definition_id uuid references public.kpi_definitions(id) on delete set null,
  name text not null,
  source_type public.benchmark_source_type not null default 'internal',
  domain text not null,
  comparison_method text,
  value_numeric numeric(20,4),
  value_json jsonb,
  source_reference text,
  benchmark_start date,
  benchmark_end date,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.targets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  metric_id uuid references public.metrics(id) on delete cascade,
  kpi_definition_id uuid references public.kpi_definitions(id) on delete cascade,
  scope_level public.scope_level not null default 'organization',
  facility_id uuid references public.facilities(id) on delete cascade,
  department_id uuid references public.departments(id) on delete cascade,
  service_line_id uuid references public.service_lines(id) on delete cascade,
  owner_user_id uuid references public.profiles(id) on delete set null,
  period_start date not null,
  period_end date not null,
  target_value numeric(20,4) not null,
  tolerance_percent numeric(8,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  metric_id uuid references public.metrics(id) on delete cascade,
  kpi_definition_id uuid references public.kpi_definitions(id) on delete cascade,
  data_quality_rule_id uuid references public.data_quality_rules(id) on delete cascade,
  facility_id uuid references public.facilities(id) on delete cascade,
  department_id uuid references public.departments(id) on delete cascade,
  name text not null,
  description text,
  severity public.alert_severity not null default 'warning',
  condition_expression text not null,
  threshold_config jsonb not null default '{}'::jsonb,
  evaluation_window jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rule_id uuid not null references public.alert_rules(id) on delete cascade,
  metric_value_id uuid references public.metric_values(id) on delete set null,
  severity public.alert_severity not null,
  state public.alert_state not null default 'new',
  title text not null,
  message text not null,
  context jsonb not null default '{}'::jsonb,
  triggered_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  acknowledged_by uuid references public.profiles(id) on delete set null,
  resolved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.alert_recipients (
  id uuid primary key default gen_random_uuid(),
  alert_rule_id uuid not null references public.alert_rules(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role_id uuid references public.roles(id) on delete cascade,
  channel public.notification_channel not null default 'in_app',
  escalation_delay_minutes integer,
  created_at timestamptz not null default now(),
  check (user_id is not null or role_id is not null)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  alert_id uuid references public.alerts(id) on delete cascade,
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  related_entity_type text,
  related_entity_id uuid,
  channel public.notification_channel not null,
  status public.notification_status not null default 'pending',
  subject text,
  body text,
  payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  read_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  actor_type public.audit_actor_type not null default 'user',
  action text not null,
  entity_type text not null,
  entity_id uuid,
  scope_level public.scope_level not null default 'organization',
  facility_id uuid references public.facilities(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  ip_address inet,
  user_agent text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.forecast_scenarios (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  baseline_scenario_id uuid references public.forecast_scenarios(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  scope_level public.scope_level not null default 'organization',
  facility_id uuid references public.facilities(id) on delete cascade,
  department_id uuid references public.departments(id) on delete cascade,
  service_line_id uuid references public.service_lines(id) on delete cascade,
  name text not null,
  description text,
  version integer not null default 1,
  status text not null default 'draft',
  starts_on date,
  ends_on date,
  assumptions_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name, version)
);

create table public.forecast_assumptions (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.forecast_scenarios(id) on delete cascade,
  assumption_key text not null,
  assumption_value jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scenario_id, assumption_key)
);

create table public.annotations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  author_user_id uuid references public.profiles(id) on delete set null,
  related_entity_type text not null,
  related_entity_id uuid not null,
  visibility public.asset_visibility not null default 'private',
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.insights (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  title text not null,
  summary text not null,
  domain text not null,
  related_entity_type text,
  related_entity_id uuid,
  confidence numeric(5,4),
  insight_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (confidence is null or (confidence >= 0 and confidence <= 1))
);

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  forecast_scenario_id uuid references public.forecast_scenarios(id) on delete set null,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  prediction_type public.prediction_type not null,
  model_name text not null,
  model_version text,
  target_entity_type text,
  target_entity_id uuid,
  prediction_for timestamptz,
  output_summary jsonb not null default '{}'::jsonb,
  confidence numeric(5,4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (confidence is null or (confidence >= 0 and confidence <= 1))
);

create table public.model_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  prediction_id uuid not null references public.predictions(id) on delete cascade,
  result_key text not null,
  result_value jsonb not null default '{}'::jsonb,
  rank_order integer,
  created_at timestamptz not null default now(),
  unique (prediction_id, result_key, rank_order)
);

create index facilities_organization_idx on public.facilities (organization_id);
create index departments_organization_idx on public.departments (organization_id);
create index profiles_organization_idx on public.profiles (organization_id);
create index user_role_assignments_user_idx on public.user_role_assignments (user_id);
create unique index user_role_assignments_scope_uidx
on public.user_role_assignments (
  user_id,
  role_id,
  organization_id,
  coalesce(facility_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(department_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(service_line_id, '00000000-0000-0000-0000-000000000000'::uuid)
);
create index data_sources_organization_idx on public.data_sources (organization_id);
create index ingestion_jobs_source_status_idx on public.ingestion_jobs (data_source_id, status);
create index patients_organization_idx on public.patients (organization_id);
create index clinical_encounters_patient_idx on public.clinical_encounters (patient_id);
create index financial_transactions_org_date_idx on public.financial_transactions (organization_id, transaction_date);
create index metric_values_metric_date_idx on public.metric_values (metric_id, as_of_date desc);
create index dashboards_organization_idx on public.dashboards (organization_id);
create index reports_organization_idx on public.reports (organization_id);
create index alerts_org_state_idx on public.alerts (organization_id, state, triggered_at desc);
create index notifications_recipient_idx on public.notifications (recipient_user_id, status);
create index audit_logs_org_created_idx on public.audit_logs (organization_id, created_at desc);
create index forecast_scenarios_org_idx on public.forecast_scenarios (organization_id);
create index predictions_org_type_idx on public.predictions (organization_id, prediction_type);

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create trigger service_lines_set_updated_at
before update on public.service_lines
for each row execute function public.set_updated_at();

create trigger facilities_set_updated_at
before update on public.facilities
for each row execute function public.set_updated_at();

create trigger departments_set_updated_at
before update on public.departments
for each row execute function public.set_updated_at();

create trigger roles_set_updated_at
before update on public.roles
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger data_sources_set_updated_at
before update on public.data_sources
for each row execute function public.set_updated_at();

create trigger integration_configurations_set_updated_at
before update on public.integration_configurations
for each row execute function public.set_updated_at();

create trigger data_quality_rules_set_updated_at
before update on public.data_quality_rules
for each row execute function public.set_updated_at();

create trigger patients_set_updated_at
before update on public.patients
for each row execute function public.set_updated_at();

create trigger clinical_encounters_set_updated_at
before update on public.clinical_encounters
for each row execute function public.set_updated_at();

create trigger financial_transactions_set_updated_at
before update on public.financial_transactions
for each row execute function public.set_updated_at();

create trigger budget_items_set_updated_at
before update on public.budget_items
for each row execute function public.set_updated_at();

create trigger kpi_definitions_set_updated_at
before update on public.kpi_definitions
for each row execute function public.set_updated_at();

create trigger metrics_set_updated_at
before update on public.metrics
for each row execute function public.set_updated_at();

create trigger dashboards_set_updated_at
before update on public.dashboards
for each row execute function public.set_updated_at();

create trigger reports_set_updated_at
before update on public.reports
for each row execute function public.set_updated_at();

create trigger dashboard_widgets_set_updated_at
before update on public.dashboard_widgets
for each row execute function public.set_updated_at();

create trigger report_schedules_set_updated_at
before update on public.report_schedules
for each row execute function public.set_updated_at();

create trigger scheduled_jobs_set_updated_at
before update on public.scheduled_jobs
for each row execute function public.set_updated_at();

create trigger benchmarks_set_updated_at
before update on public.benchmarks
for each row execute function public.set_updated_at();

create trigger targets_set_updated_at
before update on public.targets
for each row execute function public.set_updated_at();

create trigger alert_rules_set_updated_at
before update on public.alert_rules
for each row execute function public.set_updated_at();

create trigger forecast_scenarios_set_updated_at
before update on public.forecast_scenarios
for each row execute function public.set_updated_at();

create trigger forecast_assumptions_set_updated_at
before update on public.forecast_assumptions
for each row execute function public.set_updated_at();

create trigger annotations_set_updated_at
before update on public.annotations
for each row execute function public.set_updated_at();

create trigger insights_set_updated_at
before update on public.insights
for each row execute function public.set_updated_at();

create trigger predictions_set_updated_at
before update on public.predictions
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    work_email,
    last_sign_in_at,
    metadata
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    new.last_sign_in_at,
    coalesce(new.raw_user_meta_data, '{}'::jsonb)
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    work_email = excluded.work_email,
    last_sign_in_at = excluded.last_sign_in_at,
    metadata = public.profiles.metadata || excluded.metadata,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

insert into public.permissions (code, name, feature_area, description)
values
  ('dashboard.view', 'View dashboards', 'dashboards', 'Read executive and operational dashboards'),
  ('analytics.view', 'View analytics', 'analytics', 'Read KPI and analytic outputs'),
  ('reports.manage', 'Manage reports', 'reports', 'Create, schedule, and export reports'),
  ('alerts.manage', 'Manage alerts', 'alerts', 'Configure alert rules and triage alerts'),
  ('compliance.view', 'View compliance', 'compliance', 'Access audit and compliance artifacts'),
  ('integrations.manage', 'Manage integrations', 'integrations', 'Configure data sources and ingestion jobs'),
  ('admin.manage', 'Manage administration', 'admin', 'Manage tenant settings, users, and roles')
on conflict (code) do nothing;

insert into public.roles (organization_id, name, slug, description, scope_level, is_system)
values
  (null, 'Executive User', 'executive-user', 'Executive dashboard consumer', 'organization', true),
  (null, 'Finance Analyst', 'finance-analyst', 'Finance and margin analysis role', 'department', true),
  (null, 'Clinical Quality Manager', 'clinical-quality-manager', 'Clinical quality oversight role', 'department', true),
  (null, 'Operations Manager', 'operations-manager', 'Operations and throughput management role', 'facility', true),
  (null, 'Department Manager', 'department-manager', 'Department performance and alert management role', 'department', true),
  (null, 'Compliance Officer', 'compliance-officer', 'Compliance and audit review role', 'organization', true),
  (null, 'System Administrator', 'system-administrator', 'Tenant and platform administration role', 'organization', true),
  (null, 'Data Engineer', 'data-engineer', 'Integration and ingestion management role', 'organization', true)
on conflict do nothing;

commit;
