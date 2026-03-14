# Healthcare Intelligence Hub Execution Plan

This file turns the SRS in `.codex/skills/project-requirement.md` and the current schema in `supabase/migrations/20260314133000_initial_platform_schema.sql` into an execution checklist.

## Current Baseline

- [x] Next.js App Router scaffold is in place
- [x] Supabase auth client/server wiring is added
- [x] Sign-in, sign-up, and email confirmation flow are scaffolded
- [x] Initial Supabase schema migration is created
- [x] Generated schema-aligned Supabase `Database` types are added in `src/types/database.ts`
- [x] Typed repository foundation is added under `src/lib/repositories`
- [x] Protected shell now resolves current user and organization context
- [x] `/admin` now renders a live overview instead of a placeholder
- [x] Shared API response envelope and route error handling helpers are added
- [x] Shared `zod`-based validation helpers are added
- [x] Shared server-action error handling helpers are added
- [x] Shared audit logging helper is added for privileged mutations
- [x] Shared loading and error UI states exist for protected routes
- [x] `/api/admin` now returns real tenant overview data
- [x] Foundation-level unit tests are in place for validation and error handling helpers
- [x] Current-user context now resolves active roles and permission codes
- [x] `/api/auth/session` now returns live session and access data
- [x] Protected navigation now reflects role-aware module access
- [x] Admin overview access is guarded by resolved permissions and bootstrap rules
- [x] Bootstrap onboarding flow now creates the first organization and assigns the initial administrator role
- [x] `/workspace` now resolves the correct post-auth landing route from live access context
- [x] Module placeholder pages are guarded by role-aware access checks
- [x] `/api/organizations` now returns live organization access data and supports bootstrap creation
- [x] `/api/users` now returns live organization user directory data and supports invitations
- [x] Admin workspace now supports organization-scoped user invitations
- [x] `/api/facilities` and `/api/departments` now expose typed hierarchy CRUD endpoints
- [x] Admin workspace now supports facility and department creation
- [x] `/api/users` now supports profile review and returns assignment-ready user directory data
- [x] `/api/users/*-assignments` now exposes typed role, facility, and department assignment endpoints
- [x] `/api/service-lines` now exposes typed service line CRUD endpoints
- [x] Admin workspace now supports service line creation, scoped hierarchy forms, and user assignment management
- [x] `/api/roles` now exposes typed custom-role CRUD and permission assignment endpoints
- [x] Admin workspace now supports custom role management and permission composition
- [x] Email confirmation now records invitation-acceptance and confirmation audit events
- [x] Phase 1 RLS and role-permission seed migration is authored
- [ ] Supabase RLS is implemented beyond `profiles`
- [ ] Business logic APIs are implemented
- [ ] Real module UIs are implemented

## Delivery Rules

- [ ] Keep all new feature work aligned to tenant-aware RBAC
- [ ] Prefer shipping thin vertical slices over building all backend first
- [ ] Add tests for every feature before marking a phase complete
- [ ] Record schema changes as migrations only
- [ ] Keep auditability in scope for all privileged or sensitive operations

## Phase 0: Foundation Alignment

### Goal

Make the codebase ready for real feature work by aligning app types, services, database access, and error handling with the actual schema.

### Tasks

- [x] Generate Supabase TypeScript types from the database schema
- [x] Replace simplified domain types in `src/types/index.ts` with schema-aligned types
- [x] Create a typed server-side data access layer for Supabase queries and mutations
- [x] Add shared validation using a schema library for form and API input validation
- [x] Add a shared error handling pattern for server actions and route handlers
- [x] Standardize API response shapes for success, validation errors, and system failures
- [x] Add a shared audit helper for privileged mutations
- [x] Add loading, empty, and error UI states for data-driven pages
- [x] Review and clean up placeholder services under `src/features/*`
- [x] Add a project-level folder convention for repositories, services, and feature modules

### Exit Criteria

- [x] Types match the database model
- [x] New feature code can use shared repositories/services instead of placeholder helpers
- [x] Validation and error handling are consistent across auth, API, and UI layers

## Phase 1: Identity, Tenant, and RBAC

### Goal

Implement the real access-control model that every other module depends on.

### Tasks

- [x] Finalize the `profiles` lifecycle after auth sign-up and confirmation
- [x] Add organization assignment and user onboarding workflow
- [x] Implement role CRUD and permission assignment management
- [x] Implement `user_role_assignments`, `user_facility_assignments`, and `user_department_assignments`
- [x] Add role-aware session utilities for server and client code
- [x] Add current-user profile loading in protected layouts
- [x] Add role-aware sidebar and page access guards
- [ ] Implement RLS policies for tenant-scoped tables
- [x] Implement privileged admin access paths for cross-user management
- [ ] Add audit logging for login and remaining access-change events
- [ ] Add support hooks for future SSO and MFA configuration

### Exit Criteria

- [ ] Users can only access allowed organizations, facilities, departments, and features
- [x] Protected navigation reflects actual permissions
- [ ] Core tables have RLS coverage aligned with the access model

## Phase 2: Administration and Master Data

### Goal

Enable administrators to manage the tenant hierarchy and user setup.

### Tasks

- [x] Replace the `/admin` placeholder with a live tenant overview backed by profile, role, and hierarchy queries
- [x] Add a real `/api/admin` route for tenant overview data
- [ ] Build `/admin` organization settings page
- [x] Build facility management UI backed by `facilities`
- [x] Build department management UI backed by `departments`
- [x] Build service line management UI backed by `service_lines`
- [x] Build user directory and profile review UI
- [x] Build user invitation and activation flow
- [x] Build role assignment UI
- [x] Build custom role catalog UI and permission composition workflow
- [ ] Add status/effective-date management for organization hierarchy records
- [ ] Add audit trail views for admin mutations
- [ ] Add retention and notification configuration settings
- [ ] Add scheduled job settings management

### Exit Criteria

- [x] A tenant admin can bootstrap a real organization hierarchy
- [x] Users can be provisioned and assigned roles/scopes without direct database edits

## Phase 3: Data Sources, Integrations, and Data Quality

### Goal

Implement source onboarding and ingestion monitoring so the platform can receive real data.

### Tasks

- [ ] Build `/integrations` list and detail pages for `data_sources`
- [ ] Add create/edit flows for source registration
- [ ] Add connection test workflow
- [ ] Build integration configuration UI for schedules and validation rules
- [ ] Build source field mapping UI for canonical mapping setup
- [ ] Build ingestion job history view using `ingestion_jobs`
- [ ] Add manual run and rerun actions for ingestion jobs
- [ ] Add data quality rule management UI
- [ ] Add data quality issue monitoring and resolution workflow
- [ ] Add source health summary cards for last sync, failures, and stale data
- [ ] Add audit logs for integration changes and job triggers

### Exit Criteria

- [ ] Admins can register sources, configure mappings, and monitor ingestion runs
- [ ] Data quality exceptions are visible and actionable

## Phase 4: KPI Catalog and Metric Engine

### Goal

Create the analytical core that powers dashboards, reports, alerts, and benchmarks.

### Tasks

- [ ] Build CRUD UI for `kpi_definitions`
- [ ] Build CRUD UI for `metrics`
- [ ] Add versioning workflow for KPI definitions
- [ ] Add effective-date handling for KPI and benchmark changes
- [ ] Implement metric publishing flow into `metric_values`
- [ ] Add lineage metadata capture from ingestion jobs to metric values
- [ ] Add target and benchmark joins in the metric retrieval layer
- [ ] Add reusable query helpers for organization, facility, and department scoped metrics
- [ ] Add metric freshness and publication status handling
- [ ] Add tests for KPI calculation and metric query logic

### Exit Criteria

- [ ] KPI definitions and metrics are manageable from the app
- [ ] Metric values can be queried consistently for all downstream modules

## Phase 5: Dashboard Workspace

### Goal

Ship the first high-value end-user feature: role-based dashboards and executive scorecards.

### Tasks

- [ ] Build real `/dashboard` data loading from `dashboards`, `dashboard_widgets`, and `metric_values`
- [ ] Add role-based default dashboard selection
- [ ] Add KPI summary cards with target and variance display
- [ ] Add trend chart widgets
- [ ] Add date range filtering
- [ ] Add organization, facility, department, and service line filtering
- [ ] Add widget configuration and persistence
- [ ] Add drill-down from widget to metric detail
- [ ] Add last-refresh and stale-data indicators
- [ ] Add responsive dashboard behavior for tablet and mobile

### Exit Criteria

- [ ] Executives and managers can use dashboards backed by real data
- [ ] Filtering and drill-down work across tenant scopes

## Phase 6: Domain Analytics

### Goal

Deliver curated analytics views for finance, clinical quality, operations, and revenue cycle.

### Tasks

- [ ] Build `/analytics` overview shell with domain tabs
- [ ] Implement financial analytics views using `financial_transactions` and budget data
- [ ] Implement operational analytics views using occupancy, staffing, and throughput metrics
- [ ] Implement clinical quality analytics views using encounter-driven KPIs
- [ ] Implement revenue cycle analytics views for denials, collections, and A/R trends
- [ ] Add benchmark overlays where available
- [ ] Add drill-through to detailed records and supporting reports
- [ ] Add saved filters or saved views for analysts
- [ ] Add export hooks for current analytic views

### Exit Criteria

- [ ] Each required domain has a usable read-only analytics view
- [ ] Analysts can filter, compare, and drill down by scope and time

## Phase 7: Reports and Scheduled Delivery

### Goal

Enable self-service reporting, exports, and scheduled distribution.

### Tasks

- [ ] Build `/reports` list page with ownership and visibility controls
- [ ] Build report definition editor backed by `reports`
- [ ] Implement report dataset and filter configuration
- [ ] Implement tabular report rendering
- [ ] Implement CSV export
- [ ] Implement PDF export
- [ ] Implement scheduled delivery using `report_schedules`
- [ ] Implement report execution tracking using `report_runs`
- [ ] Add recipient access validation before scheduled delivery
- [ ] Add in-app access to generated reports
- [ ] Add audit logs for report runs and exports

### Exit Criteria

- [ ] Users can create, save, run, export, and schedule reports
- [ ] Report history and delivery status are visible in the app

## Phase 8: Alerts and Notifications

### Goal

Provide rule-based alerting on KPIs, variance, and data quality events.

### Tasks

- [ ] Build `/alerts` rule management UI
- [ ] Implement rule creation using `alert_rules`
- [ ] Implement recipient and escalation configuration using `alert_recipients`
- [ ] Implement alert evaluation service against metric values and data quality issues
- [ ] Create alert instances in `alerts`
- [ ] Create in-app notifications in `notifications`
- [ ] Add email notification delivery
- [ ] Implement alert lifecycle actions: acknowledge, resolve, dismiss, close
- [ ] Add alert context links back to dashboard, analytics, or compliance screens
- [ ] Add audit logs for alert rule changes and user actions

### Exit Criteria

- [ ] Alerts trigger from real data conditions
- [ ] Users can manage alert lifecycle and receive notifications

## Phase 9: Compliance and Audit

### Goal

Support oversight, audit evidence, and compliance review workflows.

### Tasks

- [ ] Build `/compliance` audit search UI
- [ ] Add filters for user, action, date range, facility, and entity type
- [ ] Add export event logging and report access logging
- [ ] Add predefined compliance report templates
- [ ] Add sensitive field masking helpers based on role and classification
- [ ] Add access review screens for privileged roles
- [ ] Add report and dashboard access audit views
- [ ] Add audit log pagination and performance tuning

### Exit Criteria

- [ ] Compliance users can review and export audit evidence
- [ ] Sensitive access events are searchable and attributable

## Phase 10: Benchmarking, Targets, and Forecasting

### Goal

Support performance comparison, target tracking, and planning scenarios.

### Tasks

- [ ] Build `/benchmarks` overview page
- [ ] Implement benchmark management using `benchmarks`
- [ ] Implement target management using `targets`
- [ ] Add variance analysis across actuals, targets, and benchmarks
- [ ] Build facility comparison views
- [ ] Build scenario management using `forecast_scenarios`
- [ ] Build assumption editor using `forecast_assumptions`
- [ ] Add side-by-side scenario comparison
- [ ] Add saved planning views and exports

### Exit Criteria

- [ ] Users can compare facilities and metrics against targets and benchmarks
- [ ] Forecast scenarios are manageable and comparable in-app

## Phase 11: External APIs and Search

### Goal

Expose controlled integration APIs and add global product search.

### Tasks

- [ ] Replace placeholder route handlers under `src/app/api/*` with real implementations
- [ ] Add scoped API authentication and authorization checks
- [ ] Add dashboards API
- [ ] Add metrics and KPI API
- [ ] Add reports and exports API
- [ ] Add alerts API
- [ ] Add users and admin API
- [ ] Add global search across dashboards, reports, KPIs, facilities, and saved assets
- [ ] Add API audit logging and request tracing
- [ ] Add rate limiting and abuse protection for external endpoints

### Exit Criteria

- [ ] Internal and external consumers can access supported APIs securely
- [ ] Global search returns relevant product entities

## Phase 12: Hardening, QA, and Release Readiness

### Goal

Make the platform safe to release and maintain.

### Tasks

- [ ] Add unit tests for services, repositories, validation, and utilities
- [ ] Add integration tests for auth, RBAC, and core feature flows
- [ ] Add end-to-end tests for sign-up, sign-in, dashboard access, reporting, and alerts
- [ ] Add performance checks for dashboard and report SLAs
- [ ] Add accessibility review against WCAG 2.1 AA expectations
- [ ] Add observability for API latency, job failures, and notification failures
- [ ] Add retry and failure-isolation handling for ingestion and scheduled jobs
- [ ] Add backup, recovery, and rollback runbooks
- [ ] Review security headers, secrets handling, and privileged operation paths
- [ ] Prepare deployment checklist for Vercel and Supabase environments

### Exit Criteria

- [ ] Core MVP flows are test-covered and production-ready
- [ ] Operational runbooks and release steps are documented

## Suggested MVP Cut

Mark MVP complete only when these phases are done:

- [x] Phase 0: Foundation Alignment
- [ ] Phase 1: Identity, Tenant, and RBAC
- [ ] Phase 2: Administration and Master Data
- [ ] Phase 3: Data Sources, Integrations, and Data Quality
- [ ] Phase 4: KPI Catalog and Metric Engine
- [ ] Phase 5: Dashboard Workspace
- [ ] Phase 7: Reports and Scheduled Delivery
- [ ] Phase 8: Alerts and Notifications
- [ ] Phase 9: Compliance and Audit

## Immediate Next Actions

- [ ] Apply and validate `supabase/migrations/20260314154000_phase1_identity_rbac.sql` in the Supabase project
- [x] Implement assignment management for roles, facilities, and departments
- [x] Build admin user directory and profile review UI on top of the new `/api/users` endpoint
- [x] Build service line CRUD and link hierarchy forms to service-line scoping
- [x] Build custom role CRUD and permission composition workflows
- [ ] Add audit logging for sign-in and remaining auth-session events
- [x] Expand `/admin` into hierarchy, user provisioning, and role assignment workflows
