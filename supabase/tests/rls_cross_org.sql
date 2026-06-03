-- =============================================================================
-- Carrot Chase — Cross-organisation authorisation tests
-- =============================================================================
-- Regression guard for the SECURITY DEFINER RPCs that bypass RLS
-- (commit_event_results, add_late_arrival). These functions must enforce
-- organisation ownership in-function, because RLS does NOT apply inside a
-- SECURITY DEFINER body. See migration 0010 and docs/SECURITY.md.
--
-- The bug this catches: the school-admin branch used is_school_admin() alone
-- (role only), letting an admin in Org A write to Org B's data. If anyone
-- reintroduces that, the NEGATIVE assertions below will fail.
--
-- How it simulates a signed-in user:
--   auth.uid() reads current_setting('request.jwt.claims')::jsonb->>'sub', so
--   we set that GUC to the test admin's id before calling each RPC. The RPC
--   runs SECURITY DEFINER (as owner) regardless of the connected role, exactly
--   as in production, so the only thing gating the write is the in-function
--   check — which is precisely what we want to test.
--
-- Fixtures use session_replication_role = replica so we can insert profiles
-- without seeding auth.users; everything is rolled back at the end.
--
-- Usage:
--   psql "$DATABASE_URL" -f supabase/tests/rls_cross_org.sql
--   # or, against the linked project (runs inside a rolled-back transaction):
--   supabase db query --linked "$(cat supabase/tests/rls_cross_org.sql)"
-- =============================================================================

\set ON_ERROR_STOP on

begin;

set local session_replication_role = replica;  -- bypass FK for hermetic fixtures

do $$
declare
  v_org_a uuid;
  v_org_b uuid;
  v_admin_a uuid := extensions.gen_random_uuid();
  -- Org B fixtures (the "victim" org)
  v_course_b uuid; v_group_b uuid; v_event_b uuid;
  -- Org A fixtures (the caller's own org)
  v_course_a uuid; v_group_a uuid; v_event_a uuid;
  raised boolean;
  ok boolean;
begin
  -- ── Fixtures ──────────────────────────────────────────────────────────────
  insert into public.organisations (name, org_type, status)
    values ('TEST Org A', 'school', 'active') returning id into v_org_a;
  insert into public.organisations (name, org_type, status)
    values ('TEST Org B', 'school', 'active') returning id into v_org_b;

  -- A school admin who belongs to Org A only.
  insert into public.profiles (id, email, full_name, role, organisation_id)
    values (v_admin_a, format('admin-a-%s@test.local', v_admin_a),
            'TEST Admin A', 'school_admin', v_org_a);

  -- Org B: course, group, event (the data Org A's admin must NOT touch).
  insert into public.courses (name, distance_metres, organisation_id, is_platform_preset)
    values ('TEST B 1km', 1000, v_org_b, false) returning id into v_course_b;
  insert into public.groups (organisation_id, name, group_type)
    values (v_org_b, 'TEST B group', 'custom') returning id into v_group_b;
  insert into public.events (group_id, course_id, format, scheduled_at, status)
    values (v_group_b, v_course_b, 'handicap'::public.event_format,
            now(), 'scheduled'::public.event_status) returning id into v_event_b;

  -- Org A: course, group, event (the admin's own data — positive controls).
  insert into public.courses (name, distance_metres, organisation_id, is_platform_preset)
    values ('TEST A 1km', 1000, v_org_a, false) returning id into v_course_a;
  insert into public.groups (organisation_id, name, group_type)
    values (v_org_a, 'TEST A group', 'custom') returning id into v_group_a;
  insert into public.events (group_id, course_id, format, scheduled_at, status)
    values (v_group_a, v_course_a, 'handicap'::public.event_format,
            now(), 'scheduled'::public.event_status) returning id into v_event_a;

  -- Sign in as Org A's admin for all calls below.
  perform set_config('request.jwt.claims',
                     json_build_object('sub', v_admin_a)::text, true);

  -- ── NEGATIVE: cross-org commit_event_results must be rejected ──────────────
  raised := false;
  begin
    perform public.commit_event_results(v_event_b, '[]'::jsonb);
  exception when others then
    raised := true;
  end;
  assert raised,
    'SECURITY REGRESSION: Org A admin was able to commit results for an Org B event';
  raise notice '✓ cross-org commit_event_results is rejected';

  -- ── NEGATIVE: cross-org add_late_arrival must be rejected ──────────────────
  raised := false;
  begin
    perform public.add_late_arrival(v_group_b, 'Cross-Org Sneaky Runner');
  exception when others then
    raised := true;
  end;
  assert raised,
    'SECURITY REGRESSION: Org A admin was able to add a late arrival to an Org B group';
  raise notice '✓ cross-org add_late_arrival is rejected';

  -- ── POSITIVE: same-org calls still succeed (no over-blocking) ──────────────
  ok := false;
  begin
    perform public.commit_event_results(v_event_a, '[]'::jsonb);
    ok := true;
  exception when others then
    ok := false;
  end;
  assert ok,
    'Org A admin should be able to commit results for their OWN event';
  raise notice '✓ same-org commit_event_results succeeds';

  ok := false;
  begin
    perform public.add_late_arrival(v_group_a, 'Legit Late Runner');
    ok := true;
  exception when others then
    ok := false;
  end;
  assert ok,
    'Org A admin should be able to add a late arrival to their OWN group';
  raise notice '✓ same-org add_late_arrival succeeds';

  -- Clear the simulated session.
  perform set_config('request.jwt.claims', '', true);

  raise notice '🔒 All cross-organisation authorisation tests passed.';
end $$;

rollback;
