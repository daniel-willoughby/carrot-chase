-- =============================================================================
-- Carrot Chase — Row Level Security policies
-- =============================================================================
-- Enforces the four-level data hierarchy at the database itself.
-- Cross-organisation access is structurally impossible, not just
-- application-blocked. See docs/SECURITY.md for the compliance model.
--
-- Role visibility summary:
--   super_admin   - all data, every organisation
--   school_admin  - their organisation only
--   lead          - groups they are assigned to (via group_leads)
--   parent        - their child's data only (Phase 2)
-- =============================================================================

-- Helper functions ------------------------------------------------------------
-- SECURITY DEFINER bypasses the caller's RLS so we can read profiles inside
-- a profiles policy without recursion. All helpers are STABLE so the planner
-- can cache results within a single query.

create or replace function public.current_role_value() returns public.user_role
language sql security definer stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and deleted_at is null;
$$;

create or replace function public.current_organisation_id() returns uuid
language sql security definer stable
set search_path = public
as $$
  select organisation_id from public.profiles where id = auth.uid() and deleted_at is null;
$$;

create or replace function public.is_super_admin() returns boolean
language sql security definer stable
set search_path = public
as $$
  select coalesce(
    (select role = 'super_admin' from public.profiles
     where id = auth.uid() and deleted_at is null),
    false
  );
$$;

create or replace function public.is_school_admin() returns boolean
language sql security definer stable
set search_path = public
as $$
  select coalesce(
    (select role = 'school_admin' from public.profiles
     where id = auth.uid() and deleted_at is null),
    false
  );
$$;

create or replace function public.leads_group(p_group_id uuid) returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists(
    select 1 from public.group_leads
    where group_id = p_group_id and lead_id = auth.uid()
  );
$$;

create or replace function public.belongs_to_organisation(p_org_id uuid) returns boolean
language sql security definer stable
set search_path = public
as $$
  select coalesce(
    (select organisation_id = p_org_id from public.profiles
     where id = auth.uid() and deleted_at is null),
    false
  );
$$;

grant execute on function public.current_role_value() to authenticated;
grant execute on function public.current_organisation_id() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_school_admin() to authenticated;
grant execute on function public.leads_group(uuid) to authenticated;
grant execute on function public.belongs_to_organisation(uuid) to authenticated;

-- =============================================================================
-- Enable RLS on every table
-- =============================================================================
alter table public.profiles          enable row level security;
alter table public.organisations     enable row level security;
alter table public.groups            enable row level security;
alter table public.group_leads       enable row level security;
alter table public.runners           enable row level security;
alter table public.runner_groups     enable row level security;
alter table public.courses           enable row level security;
alter table public.events            enable row level security;
alter table public.event_attendance  enable row level security;
alter table public.results           enable row level security;
alter table public.invitations       enable row level security;
alter table public.billing           enable row level security;

-- =============================================================================
-- profiles
-- =============================================================================
create policy "profile_self_read" on public.profiles
  for select using (id = auth.uid());

create policy "profile_super_admin_read" on public.profiles
  for select using (public.is_super_admin());

create policy "profile_same_org_read" on public.profiles
  for select using (
    organisation_id is not null
    and organisation_id = public.current_organisation_id()
  );

create policy "profile_self_update" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = public.current_role_value());  -- cannot self-elevate role

create policy "profile_super_admin_update" on public.profiles
  for update using (public.is_super_admin());

-- =============================================================================
-- organisations
-- =============================================================================
create policy "org_super_admin_all" on public.organisations
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "org_member_read" on public.organisations
  for select using (id = public.current_organisation_id());

create policy "org_school_admin_update" on public.organisations
  for update using (
    public.is_school_admin() and id = public.current_organisation_id()
  )
  with check (
    public.is_school_admin() and id = public.current_organisation_id()
  );

-- =============================================================================
-- groups
-- =============================================================================
create policy "group_super_admin_all" on public.groups
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "group_school_admin_all" on public.groups
  for all using (
    public.is_school_admin()
    and organisation_id = public.current_organisation_id()
  )
  with check (
    public.is_school_admin()
    and organisation_id = public.current_organisation_id()
  );

create policy "group_lead_read" on public.groups
  for select using (public.leads_group(id));

-- =============================================================================
-- group_leads
-- =============================================================================
create policy "group_leads_super_admin_all" on public.group_leads
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "group_leads_school_admin_all" on public.group_leads
  for all using (
    public.is_school_admin()
    and group_id in (
      select id from public.groups
      where organisation_id = public.current_organisation_id()
    )
  )
  with check (
    public.is_school_admin()
    and group_id in (
      select id from public.groups
      where organisation_id = public.current_organisation_id()
    )
  );

create policy "group_leads_self_read" on public.group_leads
  for select using (lead_id = auth.uid());

-- =============================================================================
-- runners
-- Children's personal data. Strictest policies.
-- Lead access is limited to runners in groups the lead is assigned to.
-- =============================================================================
create policy "runner_super_admin_all" on public.runners
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "runner_school_admin_all" on public.runners
  for all using (
    public.is_school_admin()
    and organisation_id = public.current_organisation_id()
  )
  with check (
    public.is_school_admin()
    and organisation_id = public.current_organisation_id()
  );

create policy "runner_lead_read" on public.runners
  for select using (
    id in (
      select rg.runner_id from public.runner_groups rg
      join public.group_leads gl on gl.group_id = rg.group_id
      where gl.lead_id = auth.uid()
    )
  );

-- =============================================================================
-- runner_groups
-- =============================================================================
create policy "runner_groups_super_admin_all" on public.runner_groups
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "runner_groups_school_admin_all" on public.runner_groups
  for all using (
    public.is_school_admin()
    and group_id in (
      select id from public.groups
      where organisation_id = public.current_organisation_id()
    )
  )
  with check (
    public.is_school_admin()
    and group_id in (
      select id from public.groups
      where organisation_id = public.current_organisation_id()
    )
  );

create policy "runner_groups_lead_read" on public.runner_groups
  for select using (public.leads_group(group_id));

-- =============================================================================
-- courses
-- Platform presets visible to everyone authenticated.
-- Custom courses scoped to organisation.
-- =============================================================================
create policy "course_presets_read" on public.courses
  for select using (is_platform_preset = true);

create policy "course_super_admin_all" on public.courses
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "course_school_admin_all" on public.courses
  for all using (
    public.is_school_admin()
    and organisation_id = public.current_organisation_id()
  )
  with check (
    public.is_school_admin()
    and organisation_id = public.current_organisation_id()
    and is_platform_preset = false
  );

create policy "course_org_member_read" on public.courses
  for select using (organisation_id = public.current_organisation_id());

-- =============================================================================
-- events
-- =============================================================================
create policy "event_super_admin_all" on public.events
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "event_school_admin_all" on public.events
  for all using (
    public.is_school_admin()
    and group_id in (
      select id from public.groups
      where organisation_id = public.current_organisation_id()
    )
  )
  with check (
    public.is_school_admin()
    and group_id in (
      select id from public.groups
      where organisation_id = public.current_organisation_id()
    )
  );

create policy "event_lead_read" on public.events
  for select using (public.leads_group(group_id));

create policy "event_lead_write" on public.events
  for update using (
    lead_id = auth.uid() or public.leads_group(group_id)
  )
  with check (
    lead_id = auth.uid() or public.leads_group(group_id)
  );

create policy "event_lead_create" on public.events
  for insert with check (
    public.leads_group(group_id)
    and lead_id = auth.uid()
  );

-- =============================================================================
-- event_attendance
-- =============================================================================
create policy "attendance_super_admin_all" on public.event_attendance
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "attendance_school_admin_all" on public.event_attendance
  for all using (
    public.is_school_admin()
    and event_id in (
      select e.id from public.events e
      join public.groups g on g.id = e.group_id
      where g.organisation_id = public.current_organisation_id()
    )
  )
  with check (
    public.is_school_admin()
    and event_id in (
      select e.id from public.events e
      join public.groups g on g.id = e.group_id
      where g.organisation_id = public.current_organisation_id()
    )
  );

create policy "attendance_lead_all" on public.event_attendance
  for all using (
    event_id in (
      select id from public.events where group_id in (
        select group_id from public.group_leads where lead_id = auth.uid()
      )
    )
  )
  with check (
    event_id in (
      select id from public.events where group_id in (
        select group_id from public.group_leads where lead_id = auth.uid()
      )
    )
  );

-- =============================================================================
-- results
-- Read access mirrors events.
-- Writes go through the commit_results Edge Function (security definer)
-- so we deny direct INSERT/UPDATE/DELETE for non-super_admins.
-- =============================================================================
create policy "result_super_admin_all" on public.results
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "result_school_admin_read" on public.results
  for select using (
    public.is_school_admin()
    and event_id in (
      select e.id from public.events e
      join public.groups g on g.id = e.group_id
      where g.organisation_id = public.current_organisation_id()
    )
  );

create policy "result_lead_read" on public.results
  for select using (
    event_id in (
      select id from public.events where group_id in (
        select group_id from public.group_leads where lead_id = auth.uid()
      )
    )
  );

-- Note: Lead writes go via the commit_results() function in migration 0003,
-- which validates the event ownership and runs as SECURITY DEFINER.

-- =============================================================================
-- invitations
-- =============================================================================
create policy "invitation_super_admin_all" on public.invitations
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "invitation_school_admin_read" on public.invitations
  for select using (
    public.is_school_admin()
    and organisation_id = public.current_organisation_id()
  );

create policy "invitation_school_admin_create" on public.invitations
  for insert with check (
    public.is_school_admin()
    and organisation_id = public.current_organisation_id()
    and invited_role in ('lead', 'school_admin')
    and invited_by = auth.uid()
  );

create policy "invitation_inviter_update" on public.invitations
  for update using (invited_by = auth.uid())
  with check (invited_by = auth.uid());

-- =============================================================================
-- billing
-- Super Admin only at MVP. School Admins can READ to see their licence/ROI.
-- =============================================================================
create policy "billing_super_admin_all" on public.billing
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "billing_school_admin_read" on public.billing
  for select using (
    public.is_school_admin()
    and organisation_id = public.current_organisation_id()
  );

-- =============================================================================
-- Role grants
--
-- The Supabase project has "Automatically expose new tables" DISABLED, so
-- table-level grants must be explicit. RLS policies above then filter rows.
--
-- Roles:
--   anon          - unauthenticated requests. Denied everything.
--   authenticated - signed-in users. RLS policies decide what they see.
--   service_role  - server-side (Edge Functions, admin tasks). Bypasses RLS.
-- =============================================================================

-- anon: no table access. Schema usage only (needed so PostgREST can answer).
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
grant usage on schema public to anon;

-- authenticated: full DML on all current tables; RLS filters rows.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- service_role: bypasses RLS but still needs the grants.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

-- Default privileges: any table or sequence created in future migrations
-- inherits these grants automatically.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant all on sequences to service_role;
alter default privileges in schema public
  grant all on functions to service_role;
