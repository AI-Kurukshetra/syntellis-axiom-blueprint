begin;

create or replace function public.current_profile_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

create or replace function public.current_user_has_permission(permission_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_role_assignments ura
    join public.role_permissions rp on rp.role_id = ura.role_id
    join public.permissions p on p.id = rp.permission_id
    where ura.user_id = auth.uid()
      and ura.starts_at <= now()
      and (ura.ends_at is null or ura.ends_at >= now())
      and ura.organization_id = public.current_profile_organization_id()
      and p.code = permission_code
  );
$$;

insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from (
  values
    ('executive-user', 'dashboard.view'),
    ('executive-user', 'analytics.view'),
    ('finance-analyst', 'dashboard.view'),
    ('finance-analyst', 'analytics.view'),
    ('finance-analyst', 'reports.manage'),
    ('clinical-quality-manager', 'dashboard.view'),
    ('clinical-quality-manager', 'analytics.view'),
    ('clinical-quality-manager', 'alerts.manage'),
    ('clinical-quality-manager', 'reports.manage'),
    ('operations-manager', 'dashboard.view'),
    ('operations-manager', 'analytics.view'),
    ('operations-manager', 'alerts.manage'),
    ('department-manager', 'dashboard.view'),
    ('department-manager', 'analytics.view'),
    ('department-manager', 'alerts.manage'),
    ('department-manager', 'reports.manage'),
    ('compliance-officer', 'compliance.view'),
    ('compliance-officer', 'reports.manage'),
    ('system-administrator', 'dashboard.view'),
    ('system-administrator', 'analytics.view'),
    ('system-administrator', 'reports.manage'),
    ('system-administrator', 'alerts.manage'),
    ('system-administrator', 'compliance.view'),
    ('system-administrator', 'integrations.manage'),
    ('system-administrator', 'admin.manage'),
    ('data-engineer', 'integrations.manage'),
    ('data-engineer', 'dashboard.view'),
    ('data-engineer', 'analytics.view'),
    ('data-engineer', 'reports.manage')
) as role_permission_map(role_slug, permission_code)
join public.roles
  on roles.slug = role_permission_map.role_slug
 and roles.organization_id is null
join public.permissions
  on permissions.code = role_permission_map.permission_code
on conflict do nothing;

alter table public.organizations enable row level security;
alter table public.facilities enable row level security;
alter table public.departments enable row level security;
alter table public.service_lines enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_role_assignments enable row level security;
alter table public.user_facility_assignments enable row level security;
alter table public.user_department_assignments enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "organizations_select_tenant" on public.organizations;
create policy "organizations_select_tenant"
on public.organizations
for select
to authenticated
using (id = public.current_profile_organization_id());

drop policy if exists "organizations_update_admin" on public.organizations;
create policy "organizations_update_admin"
on public.organizations
for update
to authenticated
using (
  id = public.current_profile_organization_id()
  and public.current_user_has_permission('admin.manage')
)
with check (
  id = public.current_profile_organization_id()
  and public.current_user_has_permission('admin.manage')
);

drop policy if exists "facilities_select_tenant" on public.facilities;
create policy "facilities_select_tenant"
on public.facilities
for select
to authenticated
using (organization_id = public.current_profile_organization_id());

drop policy if exists "facilities_manage_admin" on public.facilities;
create policy "facilities_manage_admin"
on public.facilities
for all
to authenticated
using (
  organization_id = public.current_profile_organization_id()
  and public.current_user_has_permission('admin.manage')
)
with check (
  organization_id = public.current_profile_organization_id()
  and public.current_user_has_permission('admin.manage')
);

drop policy if exists "departments_select_tenant" on public.departments;
create policy "departments_select_tenant"
on public.departments
for select
to authenticated
using (organization_id = public.current_profile_organization_id());

drop policy if exists "departments_manage_admin" on public.departments;
create policy "departments_manage_admin"
on public.departments
for all
to authenticated
using (
  organization_id = public.current_profile_organization_id()
  and public.current_user_has_permission('admin.manage')
)
with check (
  organization_id = public.current_profile_organization_id()
  and public.current_user_has_permission('admin.manage')
);

drop policy if exists "service_lines_select_tenant" on public.service_lines;
create policy "service_lines_select_tenant"
on public.service_lines
for select
to authenticated
using (organization_id = public.current_profile_organization_id());

drop policy if exists "service_lines_manage_admin" on public.service_lines;
create policy "service_lines_manage_admin"
on public.service_lines
for all
to authenticated
using (
  organization_id = public.current_profile_organization_id()
  and public.current_user_has_permission('admin.manage')
)
with check (
  organization_id = public.current_profile_organization_id()
  and public.current_user_has_permission('admin.manage')
);

drop policy if exists "roles_select_tenant" on public.roles;
create policy "roles_select_tenant"
on public.roles
for select
to authenticated
using (
  organization_id is null
  or organization_id = public.current_profile_organization_id()
);

drop policy if exists "roles_manage_admin" on public.roles;
create policy "roles_manage_admin"
on public.roles
for all
to authenticated
using (
  organization_id = public.current_profile_organization_id()
  and not is_system
  and public.current_user_has_permission('admin.manage')
)
with check (
  organization_id = public.current_profile_organization_id()
  and not is_system
  and public.current_user_has_permission('admin.manage')
);

drop policy if exists "permissions_select_authenticated" on public.permissions;
create policy "permissions_select_authenticated"
on public.permissions
for select
to authenticated
using (true);

drop policy if exists "role_permissions_select_tenant" on public.role_permissions;
create policy "role_permissions_select_tenant"
on public.role_permissions
for select
to authenticated
using (
  exists (
    select 1
    from public.roles
    where roles.id = role_permissions.role_id
      and (
        roles.organization_id is null
        or roles.organization_id = public.current_profile_organization_id()
      )
  )
);

drop policy if exists "role_permissions_manage_admin" on public.role_permissions;
create policy "role_permissions_manage_admin"
on public.role_permissions
for all
to authenticated
using (
  exists (
    select 1
    from public.roles
    where roles.id = role_permissions.role_id
      and roles.organization_id = public.current_profile_organization_id()
      and not roles.is_system
  )
  and public.current_user_has_permission('admin.manage')
)
with check (
  exists (
    select 1
    from public.roles
    where roles.id = role_permissions.role_id
      and roles.organization_id = public.current_profile_organization_id()
      and not roles.is_system
  )
  and public.current_user_has_permission('admin.manage')
);

drop policy if exists "profiles_select_org_admin" on public.profiles;
create policy "profiles_select_org_admin"
on public.profiles
for select
to authenticated
using (
  organization_id = public.current_profile_organization_id()
  and public.current_user_has_permission('admin.manage')
);

drop policy if exists "profiles_update_org_admin" on public.profiles;
create policy "profiles_update_org_admin"
on public.profiles
for update
to authenticated
using (
  organization_id = public.current_profile_organization_id()
  and public.current_user_has_permission('admin.manage')
)
with check (
  organization_id = public.current_profile_organization_id()
  and public.current_user_has_permission('admin.manage')
);

drop policy if exists "user_role_assignments_select_own_or_admin" on public.user_role_assignments;
create policy "user_role_assignments_select_own_or_admin"
on public.user_role_assignments
for select
to authenticated
using (
  user_id = auth.uid()
  or (
    organization_id = public.current_profile_organization_id()
    and public.current_user_has_permission('admin.manage')
  )
);

drop policy if exists "user_role_assignments_manage_admin" on public.user_role_assignments;
create policy "user_role_assignments_manage_admin"
on public.user_role_assignments
for all
to authenticated
using (
  organization_id = public.current_profile_organization_id()
  and public.current_user_has_permission('admin.manage')
)
with check (
  organization_id = public.current_profile_organization_id()
  and public.current_user_has_permission('admin.manage')
);

drop policy if exists "user_facility_assignments_select_own_or_admin" on public.user_facility_assignments;
create policy "user_facility_assignments_select_own_or_admin"
on public.user_facility_assignments
for select
to authenticated
using (
  user_id = auth.uid()
  or (
    exists (
      select 1
      from public.facilities
      where facilities.id = user_facility_assignments.facility_id
        and facilities.organization_id = public.current_profile_organization_id()
    )
    and public.current_user_has_permission('admin.manage')
  )
);

drop policy if exists "user_facility_assignments_manage_admin" on public.user_facility_assignments;
create policy "user_facility_assignments_manage_admin"
on public.user_facility_assignments
for all
to authenticated
using (
  exists (
    select 1
    from public.facilities
    where facilities.id = user_facility_assignments.facility_id
      and facilities.organization_id = public.current_profile_organization_id()
  )
  and public.current_user_has_permission('admin.manage')
)
with check (
  exists (
    select 1
    from public.facilities
    where facilities.id = user_facility_assignments.facility_id
      and facilities.organization_id = public.current_profile_organization_id()
  )
  and public.current_user_has_permission('admin.manage')
);

drop policy if exists "user_department_assignments_select_own_or_admin" on public.user_department_assignments;
create policy "user_department_assignments_select_own_or_admin"
on public.user_department_assignments
for select
to authenticated
using (
  user_id = auth.uid()
  or (
    exists (
      select 1
      from public.departments
      where departments.id = user_department_assignments.department_id
        and departments.organization_id = public.current_profile_organization_id()
    )
    and public.current_user_has_permission('admin.manage')
  )
);

drop policy if exists "user_department_assignments_manage_admin" on public.user_department_assignments;
create policy "user_department_assignments_manage_admin"
on public.user_department_assignments
for all
to authenticated
using (
  exists (
    select 1
    from public.departments
    where departments.id = user_department_assignments.department_id
      and departments.organization_id = public.current_profile_organization_id()
  )
  and public.current_user_has_permission('admin.manage')
)
with check (
  exists (
    select 1
    from public.departments
    where departments.id = user_department_assignments.department_id
      and departments.organization_id = public.current_profile_organization_id()
  )
  and public.current_user_has_permission('admin.manage')
);

commit;
