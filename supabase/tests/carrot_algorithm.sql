-- =============================================================================
-- Carrot Chase — Carrot Algorithm tests
-- =============================================================================
-- Plain-SQL assertions. Run against a database that has migrations 0001-0003
-- applied (an empty staging DB is fine — the calculate_level test creates and
-- cleans up its own fixtures inside a transaction).
--
-- Usage:
--   supabase db execute --file supabase/tests/carrot_algorithm.sql
--   # or
--   psql "$DATABASE_URL" -f supabase/tests/carrot_algorithm.sql
--
-- An ASSERT failure aborts the script with a clear message. Successful runs
-- print one NOTICE per test plus a final summary.
-- =============================================================================

\set ON_ERROR_STOP on

begin;

-- ── pace_to_level: anchor points ──────────────────────────────────────────────
do $$
begin
  assert public.pace_to_level(170) = 0,
    format('expected pace_to_level(170)=0, got %s', public.pace_to_level(170));
  assert public.pace_to_level(720) = 99,
    format('expected pace_to_level(720)=99, got %s', public.pace_to_level(720));
  -- 22-min 5K → 264 s/km → roughly level 17 (calibration-dependent)
  assert public.pace_to_level(264) between 15 and 19,
    format('expected pace_to_level(264) ≈ 17, got %s', public.pace_to_level(264));
  -- 37-min 5K → 444 s/km → roughly level 49
  assert public.pace_to_level(444) between 47 and 51,
    format('expected pace_to_level(444) ≈ 49, got %s', public.pace_to_level(444));
  raise notice '✓ pace_to_level anchor points pass';
end $$;

-- ── pace_to_level: clamping ───────────────────────────────────────────────────
do $$
begin
  assert public.pace_to_level(50) = 0, 'pace below 170 should clamp to 0';
  assert public.pace_to_level(99999) = 99, 'pace above 720 should clamp to 99';
  raise notice '✓ pace_to_level clamps correctly';
end $$;

-- ── calculate_stagger: monotonic and clamped ──────────────────────────────────
do $$
begin
  -- Slowest gets 0 offset
  assert public.calculate_stagger(99::smallint, 99::smallint, 1500) = 0,
    'slowest runner should get 0 stagger';
  -- Bigger level gap → bigger stagger
  assert public.calculate_stagger(30::smallint, 60::smallint, 1500) <
         public.calculate_stagger(10::smallint, 60::smallint, 1500),
    'stagger should grow with level gap';
  -- Clamp: tiny course + tiny gap still gives at least 10s
  assert public.calculate_stagger(50::smallint, 55::smallint, 500) >= 10,
    'stagger should clamp to >= 10s';
  -- Clamp: huge gap should cap at 120s
  assert public.calculate_stagger(1::smallint, 99::smallint, 10000) <= 120,
    'stagger should clamp to <= 120s';
  raise notice '✓ calculate_stagger monotonicity + clamping pass';
end $$;

-- ── calculate_level: fixture-driven end-to-end ────────────────────────────────
-- Create a transient organisation, course, group, runner, and 5 results.
-- Verify the algorithm picks the second-fastest pace.
do $$
declare
  v_org uuid;
  v_course uuid;
  v_group uuid;
  v_runner uuid;
  v_event uuid;
  v_lead uuid;
  v_level smallint;
  v_paces numeric[] := array[420, 410, 405, 415, 408];  -- 5 result paces (s/km)
  v_pace numeric;
  i int;
begin
  -- Fixture org
  insert into public.organisations (name, org_type, status)
  values ('TEST org', 'school', 'active') returning id into v_org;

  -- Fixture course: 1000m so seconds == pace s/km
  insert into public.courses (name, distance_metres, organisation_id, is_platform_preset)
  values ('TEST 1km', 1000, v_org, false) returning id into v_course;

  -- Fixture group
  insert into public.groups (organisation_id, name, group_type)
  values (v_org, 'TEST group', 'custom') returning id into v_group;

  -- Fixture lead profile (need a profiles row; auth.users id is generated)
  v_lead := extensions.gen_random_uuid();
  insert into public.profiles (id, organisation_id, email, full_name, role)
  values (v_lead, v_org, format('lead-%s@test.local', v_lead), 'TEST lead', 'lead');

  -- Fixture runner
  insert into public.runners (organisation_id, full_name, current_level)
  values (v_org, 'TEST runner', 60) returning id into v_runner;

  -- 5 events, each with a single result for our runner
  for i in 1..5 loop
    insert into public.events (group_id, course_id, lead_id, format, scheduled_at, status)
    values (v_group, v_course, v_lead, 'handicap'::public.event_format,
            now() - (i || ' days')::interval, 'completed'::public.event_status)
    returning id into v_event;

    insert into public.results (
      event_id, runner_id, finish_position,
      raw_time_seconds, adjusted_time_seconds, finished_at
    )
    values (
      v_event, v_runner, 1,
      v_paces[i]::int, v_paces[i]::int,
      now() - (i || ' days')::interval
    );
  end loop;

  -- Algorithm should pick second-fastest pace.
  -- v_paces sorted asc: 405, 408, 410, 415, 420 → second-fastest = 408
  v_pace := 408;
  v_level := public.calculate_level(v_runner);
  assert v_level = public.pace_to_level(v_pace),
    format('expected level %s (pace %s), got %s', public.pace_to_level(v_pace), v_pace, v_level);

  raise notice '✓ calculate_level picks second-fastest pace (level=%s for pace=%s s/km)', v_level, v_pace;
end $$;

-- ── Final summary ─────────────────────────────────────────────────────────────
do $$ begin raise notice '🥕 All Carrot Algorithm tests passed.'; end $$;

-- Rollback fixtures
rollback;
