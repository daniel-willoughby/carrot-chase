-- =============================================================================
-- Carrot Chase — Initial Schema
-- =============================================================================
-- Implements the four-level hierarchy from the product specification:
--   Platform > Organisation > Group > Event
--
-- Key decisions baked in here (see stack-report.pdf for full rationale):
--   - Multi-group runner membership via runner_groups junction (US-13)
--   - Soft deletes on groups and runners (preserve event history)
--   - Time-series results table (powers ten-event progression chart)
--   - Custom invitations table (72h expiring tokens, status tracking)
--   - Stripe customer ID columns on organisations (Phase 2 ready)
-- =============================================================================

-- Extensions ------------------------------------------------------------------
create extension if not exists "pgcrypto" with schema "extensions";
create extension if not exists "uuid-ossp" with schema "extensions";

-- Enums -----------------------------------------------------------------------
create type public.user_role as enum (
  'super_admin',
  'school_admin',
  'lead',
  'parent'
);

create type public.org_type as enum (
  'school',
  'business',
  'club',
  'distributor',
  'mat'
);

create type public.org_status as enum (
  'active',
  'suspended',
  'archived'
);

create type public.group_type as enum (
  'year',
  'class',
  'club',
  'pe_class',
  'breakfast_club',
  'custom'
);

create type public.event_format as enum (
  'scratch',
  'handicap',
  'relay'
);

create type public.event_status as enum (
  'scheduled',
  'in_progress',
  'completed',
  'cancelled'
);

create type public.attendance_status as enum (
  'present',
  'dns',     -- did not start
  'dnf'      -- did not finish
);

create type public.medal as enum (
  'gold',
  'silver',
  'bronze'
);

create type public.invitation_status as enum (
  'sent',
  'accepted',
  'expired',
  'revoked'
);

-- =============================================================================
-- profiles
-- Extends auth.users with Carrot Chase domain fields.
-- Created automatically by a trigger on auth.users insert.
-- =============================================================================
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null unique,
  full_name       text,
  role            public.user_role not null default 'lead',
  organisation_id uuid,                                       -- fk added after organisations table
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create index profiles_organisation_id_idx on public.profiles(organisation_id) where deleted_at is null;
create index profiles_role_idx on public.profiles(role) where deleted_at is null;

-- =============================================================================
-- organisations
-- Schools, clubs, MATs, corporate accounts. The "Organisation" hierarchy level.
-- =============================================================================
create table public.organisations (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  org_type            public.org_type not null default 'school',
  status              public.org_status not null default 'active',
  location            text,
  logo_url            text,
  primary_admin_id    uuid references public.profiles(id),
  -- Phase 2 billing (Stripe Connect ready) ---------------------------------
  stripe_customer_id  text unique,
  -- Phase 2 MAT linking ----------------------------------------------------
  mat_parent_id       uuid references public.organisations(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

create index organisations_status_idx on public.organisations(status) where deleted_at is null;
create index organisations_mat_parent_idx on public.organisations(mat_parent_id) where mat_parent_id is not null;

-- Now we can add the FK from profiles back to organisations
alter table public.profiles
  add constraint profiles_organisation_id_fkey
  foreign key (organisation_id) references public.organisations(id) on delete set null;

-- =============================================================================
-- groups
-- Year groups, classes, breakfast clubs, etc. The "Group" hierarchy level.
-- Soft-delete required to preserve event history (US-10).
-- =============================================================================
create table public.groups (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  name            text not null,
  group_type      public.group_type not null default 'custom',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create index groups_organisation_idx on public.groups(organisation_id) where deleted_at is null;

-- =============================================================================
-- group_leads
-- A lead can be assigned to multiple groups; a group can have multiple leads.
-- =============================================================================
create table public.group_leads (
  group_id    uuid not null references public.groups(id) on delete cascade,
  lead_id     uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (group_id, lead_id)
);

create index group_leads_lead_idx on public.group_leads(lead_id);

-- =============================================================================
-- runners
-- The children. They do not have direct platform access in MVP.
-- CC-XXXX ID is generated from a sequence on insert.
-- =============================================================================
create sequence public.runner_cc_seq start with 1000;

create or replace function public.generate_cc_id() returns text
language sql
as $$
  select 'CC-' || lpad(nextval('public.runner_cc_seq')::text, 4, '0');
$$;

create table public.runners (
  id                    uuid primary key default gen_random_uuid(),
  cc_id                 text not null unique default public.generate_cc_id(),
  organisation_id       uuid not null references public.organisations(id) on delete cascade,
  full_name             text not null,
  year_group            text,
  current_level         smallint not null default 60 check (current_level between 0 and 99),
  personal_best_seconds numeric(7,2),
  streak_count          smallint not null default 0,
  -- Phase 2 parent linking
  parent_id             uuid references public.profiles(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz
);

create index runners_organisation_idx on public.runners(organisation_id) where deleted_at is null;
create index runners_cc_id_idx on public.runners(cc_id);

-- =============================================================================
-- runner_groups (junction)
-- US-13 — multi-group membership. A child in PE class AND running club
-- belongs to both groups simultaneously. Their level and history is shared
-- across all their groups.
-- =============================================================================
create table public.runner_groups (
  runner_id  uuid not null references public.runners(id) on delete cascade,
  group_id   uuid not null references public.groups(id) on delete cascade,
  added_at   timestamptz not null default now(),
  primary key (runner_id, group_id)
);

create index runner_groups_group_idx on public.runner_groups(group_id);

-- =============================================================================
-- courses
-- Reusable course templates. Four platform-wide presets seeded later;
-- School Admins can save their own custom courses.
-- =============================================================================
create table public.courses (
  id                  uuid primary key default gen_random_uuid(),
  organisation_id     uuid references public.organisations(id) on delete cascade,
  name                text not null,
  distance_metres     integer not null check (distance_metres > 0),
  map_url             text,                                  -- supabase storage ref
  marshal_points      jsonb not null default '[]'::jsonb,
  is_platform_preset  boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz,
  -- Platform presets have null organisation_id and is_platform_preset = true
  constraint course_org_or_preset check (
    (organisation_id is not null and is_platform_preset = false)
    or
    (organisation_id is null and is_platform_preset = true)
  )
);

create index courses_organisation_idx on public.courses(organisation_id) where deleted_at is null;
create index courses_preset_idx on public.courses(is_platform_preset) where is_platform_preset = true;

-- =============================================================================
-- events
-- The "Event" hierarchy level. One group, one course, one date, one lead.
-- =============================================================================
create table public.events (
  id                  uuid primary key default gen_random_uuid(),
  group_id            uuid not null references public.groups(id) on delete cascade,
  course_id           uuid not null references public.courses(id),
  lead_id             uuid references public.profiles(id) on delete set null,
  format              public.event_format not null default 'handicap',
  scheduled_at        timestamptz not null,
  status              public.event_status not null default 'scheduled',
  marshals_required   smallint,
  notes               text,
  term                text,                                  -- e.g. "Spring Term 2026"
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

create index events_group_idx on public.events(group_id) where deleted_at is null;
create index events_scheduled_idx on public.events(scheduled_at) where deleted_at is null;
create index events_term_idx on public.events(term) where deleted_at is null;

-- =============================================================================
-- event_attendance
-- Who turned up. Stagger offset stored per attendee.
-- DNS = absent at attendance; DNF = present but didn't finish.
-- =============================================================================
create table public.event_attendance (
  event_id                uuid not null references public.events(id) on delete cascade,
  runner_id               uuid not null references public.runners(id) on delete cascade,
  status                  public.attendance_status not null default 'present',
  stagger_offset_seconds  numeric(6,2) not null default 0,
  recorded_at             timestamptz not null default now(),
  primary key (event_id, runner_id)
);

create index event_attendance_runner_idx on public.event_attendance(runner_id);

-- =============================================================================
-- results
-- Time-series. One row per (event, runner) finish.
-- Powers the ten-event progression chart on runner profiles.
-- Adjusted time = raw time - stagger offset.
-- =============================================================================
create table public.results (
  id                      uuid primary key default gen_random_uuid(),
  event_id                uuid not null references public.events(id) on delete cascade,
  runner_id               uuid not null references public.runners(id) on delete cascade,
  finish_position         smallint not null,
  raw_time_seconds        numeric(7,2) not null,
  adjusted_time_seconds   numeric(7,2) not null,
  medal                   public.medal,
  is_personal_best        boolean not null default false,
  is_most_improved        boolean not null default false,
  level_before            smallint,
  level_after             smallint,
  level_change            smallint generated always as (level_after - level_before) stored,
  finished_at             timestamptz not null default now(),
  created_at              timestamptz not null default now(),
  unique (event_id, runner_id)
);

create index results_runner_idx on public.results(runner_id, finished_at desc);
create index results_event_idx on public.results(event_id);

-- =============================================================================
-- invitations
-- Custom invite token system (E1 — US-01 through US-04).
-- 72h expiring tokens with status tracking. Required because Supabase's
-- built-in invite flow does not support visible status or one-click resend.
-- =============================================================================
create table public.invitations (
  id                  uuid primary key default gen_random_uuid(),
  token               text not null unique default encode(extensions.gen_random_bytes(32), 'hex'),
  email               text not null,
  invited_role        public.user_role not null,
  organisation_id     uuid references public.organisations(id) on delete cascade,
  group_assignments   uuid[] not null default '{}',          -- for lead invites
  invited_by          uuid not null references public.profiles(id) on delete cascade,
  status              public.invitation_status not null default 'sent',
  sent_at             timestamptz not null default now(),
  expires_at          timestamptz not null default (now() + interval '72 hours'),
  accepted_at         timestamptz,
  accepted_by         uuid references public.profiles(id) on delete set null,
  -- Constraints
  constraint invitation_role_needs_org check (
    (invited_role = 'super_admin' and organisation_id is null)
    or
    (invited_role <> 'super_admin' and organisation_id is not null)
  )
);

create index invitations_email_idx on public.invitations(email);
create index invitations_status_idx on public.invitations(status);
create index invitations_organisation_idx on public.invitations(organisation_id);

-- =============================================================================
-- billing
-- Phase 2 Stripe Connect ready. Empty in MVP (manual invoicing).
-- =============================================================================
create table public.billing (
  id                          uuid primary key default gen_random_uuid(),
  organisation_id             uuid not null references public.organisations(id) on delete cascade,
  stripe_subscription_id      text unique,
  licence_year_starts         date,
  licence_year_ends           date,
  amount_invoiced_pence       integer not null default 0,
  amount_paid_pence           integer not null default 0,
  subscription_status         text,                          -- mirrors Stripe status string
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index billing_organisation_idx on public.billing(organisation_id);

-- =============================================================================
-- updated_at trigger
-- Auto-bump updated_at on every UPDATE to maintain change tracking.
-- =============================================================================
create or replace function public.set_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'profiles', 'organisations', 'groups', 'runners',
      'courses', 'events', 'billing'
    ])
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at();',
      t
    );
  end loop;
end$$;

-- =============================================================================
-- profile auto-creation
-- When a new auth.users row is inserted (signup), create a matching profile.
-- Role defaults to 'lead' and is upgraded by the invitation acceptance flow.
-- =============================================================================
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- Seed: four platform preset courses (referenced by E5)
-- =============================================================================
insert into public.courses (name, distance_metres, is_platform_preset, organisation_id) values
  ('Track 400m',     400,  true, null),
  ('Field 800m',     800,  true, null),
  ('Cross 1500m',    1500, true, null),
  ('Long 5000m',     5000, true, null);
