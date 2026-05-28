-- =============================================================================
-- Carrot Chase — The Carrot Algorithm
-- =============================================================================
-- Proprietary level calculation. From the product specification:
--   "The level is calculated from the runner's second-fastest time across their
--    last five runs — a rule designed to prevent sandbagging while rewarding
--    consistency. Levels are dynamic and update after every event."
--
-- Level scale (anchored to the four reference points from the product doc):
--   Level 0  — Elite (Olympic / national standard, ~2:50/km, ~14-min 5K)
--   Level 23 — Competent club runner (~4:24/km, ~22-min 5K)
--   Level 60 — Recreational runner   (~7:30/km, ~37-min 5K)
--   Level 99 — Beginner / walker     (~12:00/km, ~60-min 5K)
--
-- These map linearly across 170 s/km (level 0) to 720 s/km (level 99).
-- =============================================================================

-- ─── pace_to_level ────────────────────────────────────────────────────────────
-- Pure helper. Given pace in seconds-per-kilometre, return level 0-99.
create or replace function public.pace_to_level(pace_seconds_per_km numeric)
returns smallint
language sql immutable
as $$
  select greatest(0, least(99,
    round(((pace_seconds_per_km - 170) / 550.0) * 99)::int
  ))::smallint;
$$;

-- ─── calculate_level ──────────────────────────────────────────────────────────
-- The Carrot Algorithm: returns the level for a runner based on the
-- second-fastest pace across their last five recorded results.
-- Falls back to the fastest result if they have only one, or 60 (recreational)
-- if they have none.
create or replace function public.calculate_level(p_runner_id uuid)
returns smallint
language plpgsql stable
as $$
declare
  v_pace numeric;
begin
  with recent_results as (
    select
      r.adjusted_time_seconds / (c.distance_metres / 1000.0) as pace_s_per_km
    from public.results r
    join public.events e on e.id = r.event_id
    join public.courses c on c.id = e.course_id
    where r.runner_id = p_runner_id
    order by r.finished_at desc
    limit 5
  ),
  ranked as (
    select
      pace_s_per_km,
      row_number() over (order by pace_s_per_km asc) as rnk,
      count(*) over () as n
    from recent_results
  )
  select pace_s_per_km
  into v_pace
  from ranked
  where rnk = least(2, n);   -- second-fastest if 2+ runs, fastest if only 1

  if v_pace is null then
    return 60;   -- new runner default
  end if;

  return public.pace_to_level(v_pace);
end;
$$;

-- ─── calculate_stagger ────────────────────────────────────────────────────────
-- Given a runner's level and the slowest level in the field, return the
-- stagger offset in seconds. Slower runners (higher level) get a head start.
-- Result is clamped to the 10-120 s window per US-20.
create or replace function public.calculate_stagger(
  p_runner_level smallint,
  p_slowest_level smallint,
  p_course_distance_metres int
) returns numeric
language sql immutable
as $$
  with delta as (
    -- Level difference. Slowest gets 0 offset (their start = race start).
    select (p_slowest_level - p_runner_level)::numeric as level_gap
  ),
  scaled as (
    -- Roughly 1s per level per km. So 5K with 30-level gap = 150s.
    select least(120, greatest(10,
      (select level_gap from delta) * (p_course_distance_metres / 1000.0)
    )) as offset_s
  )
  select offset_s from scaled;
$$;

-- ─── commit_event_results ────────────────────────────────────────────────────
-- Atomic post-race finalisation. Takes raw finish times and stagger offsets
-- already recorded in event_attendance / temporary table, plus per-runner
-- raw times. Calculates adjusted times, assigns positions, awards medals,
-- flags PBs and "most improved", recalculates levels.
--
-- Call signature designed to be invoked from an Edge Function or Server Action
-- with a jsonb array of { runner_id, raw_time_seconds }.
create or replace function public.commit_event_results(
  p_event_id uuid,
  p_finishers jsonb
) returns table(runner_id uuid, finish_position smallint, level_after smallint, is_pb boolean)
language plpgsql
as $$
declare
  v_course_distance int;
begin
  -- Lookup course distance for adjusted-time → pace conversion later.
  select c.distance_metres into v_course_distance
  from public.events e
  join public.courses c on c.id = e.course_id
  where e.id = p_event_id;

  if v_course_distance is null then
    raise exception 'event % not found or has no course', p_event_id;
  end if;

  -- Stage the inputs into a temp working set.
  create temporary table _commit_input on commit drop as
  select
    (elem ->> 'runner_id')::uuid as runner_id,
    (elem ->> 'raw_time_seconds')::numeric as raw_time_seconds
  from jsonb_array_elements(p_finishers) as elem;

  -- Pull stagger offsets and compute adjusted times.
  create temporary table _commit_calc on commit drop as
  select
    i.runner_id,
    i.raw_time_seconds,
    coalesce(a.stagger_offset_seconds, 0) as stagger,
    i.raw_time_seconds - coalesce(a.stagger_offset_seconds, 0) as adjusted,
    r.current_level as level_before,
    r.personal_best_seconds as old_pb
  from _commit_input i
  left join public.event_attendance a
    on a.event_id = p_event_id and a.runner_id = i.runner_id
  join public.runners r on r.id = i.runner_id;

  -- Assign positions by adjusted time (ascending = faster = higher position).
  create temporary table _commit_ranked on commit drop as
  select
    *,
    row_number() over (order by adjusted asc) as position
  from _commit_calc;

  -- Insert results rows with medals, PB flags, level deltas.
  insert into public.results (
    event_id, runner_id, finish_position, raw_time_seconds,
    adjusted_time_seconds, medal, is_personal_best, level_before, level_after,
    finished_at
  )
  select
    p_event_id,
    cr.runner_id,
    cr.position::smallint,
    cr.raw_time_seconds,
    cr.adjusted,
    case cr.position
      when 1 then 'gold'::public.medal
      when 2 then 'silver'::public.medal
      when 3 then 'bronze'::public.medal
      else null
    end,
    (cr.old_pb is null or cr.adjusted < cr.old_pb),
    cr.level_before,
    -- Provisional level_after computed after results land below.
    cr.level_before,
    now()
  from _commit_ranked cr;

  -- Update runner PBs where beaten.
  update public.runners r
  set personal_best_seconds = cr.adjusted
  from _commit_ranked cr
  where r.id = cr.runner_id
    and (r.personal_best_seconds is null or cr.adjusted < r.personal_best_seconds);

  -- Recalculate levels now that the new results are committed.
  update public.runners r
  set current_level = public.calculate_level(r.id)
  from _commit_ranked cr
  where r.id = cr.runner_id;

  -- Write the new level back into the results.level_after column.
  update public.results res
  set level_after = r.current_level
  from public.runners r
  where res.event_id = p_event_id
    and res.runner_id = r.id;

  -- Flag most-improved (largest positive level delta, i.e. biggest improvement
  -- = largest drop in number).
  with deltas as (
    select id, (level_before - level_after) as delta
    from public.results
    where event_id = p_event_id
  ),
  best as (
    select id from deltas where delta > 0 order by delta desc limit 1
  )
  update public.results
  set is_most_improved = true
  where id in (select id from best);

  -- Update streaks: increment for every finisher.
  update public.runners r
  set streak_count = r.streak_count + 1
  from _commit_ranked cr
  where r.id = cr.runner_id;

  -- Mark the event completed.
  update public.events
  set status = 'completed'
  where id = p_event_id;

  return query
  select res.runner_id, res.finish_position, res.level_after, res.is_personal_best
  from public.results res
  where res.event_id = p_event_id;
end;
$$;

grant execute on function public.pace_to_level(numeric) to authenticated;
grant execute on function public.calculate_level(uuid) to authenticated;
grant execute on function public.calculate_stagger(smallint, smallint, int) to authenticated;
grant execute on function public.commit_event_results(uuid, jsonb) to authenticated;
