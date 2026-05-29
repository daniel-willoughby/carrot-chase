-- =============================================================================
-- 0005_fix_commit_event_results.sql
--
-- Fix two issues in commit_event_results discovered during the first real
-- end-to-end run:
--   1. `level_after` is both an OUT column on the RETURNS TABLE and a column
--      on public.results — the UPDATE ... SET level_after = ... is ambiguous
--      and Postgres rejects it (SQLSTATE 42702). Rename the OUT parameter to
--      `out_level_after` and adjust the RETURN QUERY accordingly.
--   2. The inserted row uses level_before as the provisional level_after, but
--      the final UPDATE that rewrites level_after never runs because of (1).
--      Once (1) is fixed the existing UPDATE does the right thing.
-- =============================================================================

-- Must drop first: CREATE OR REPLACE can't change the RETURNS TABLE shape
-- once the original return-row type is fixed.
drop function if exists public.commit_event_results(uuid, jsonb);

create function public.commit_event_results(
  p_event_id uuid,
  p_finishers jsonb
) returns table(
  runner_id uuid,
  finish_position smallint,
  out_level_after smallint,
  is_pb boolean
)
language plpgsql
as $$
declare
  v_course_distance int;
begin
  select c.distance_metres into v_course_distance
  from public.events e
  join public.courses c on c.id = e.course_id
  where e.id = p_event_id;

  if v_course_distance is null then
    raise exception 'event % not found or has no course', p_event_id;
  end if;

  create temporary table _commit_input on commit drop as
  select
    (elem ->> 'runner_id')::uuid as runner_id,
    (elem ->> 'raw_time_seconds')::numeric as raw_time_seconds
  from jsonb_array_elements(p_finishers) as elem;

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

  create temporary table _commit_ranked on commit drop as
  select
    *,
    row_number() over (order by adjusted asc nulls last) as position
  from _commit_calc;

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
    (cr.adjusted is not null and (cr.old_pb is null or cr.adjusted < cr.old_pb)),
    cr.level_before,
    cr.level_before,
    now()
  from _commit_ranked cr;

  update public.runners r
  set personal_best_seconds = cr.adjusted
  from _commit_ranked cr
  where r.id = cr.runner_id
    and cr.adjusted is not null
    and (r.personal_best_seconds is null or cr.adjusted < r.personal_best_seconds);

  update public.runners r
  set current_level = public.calculate_level(r.id)
  from _commit_ranked cr
  where r.id = cr.runner_id;

  -- Rewrite results.level_after with the freshly recalculated level. Qualify
  -- both sides of the SET to avoid the OUT-parameter / column ambiguity.
  update public.results res
  set level_after = r.current_level
  from public.runners r
  where res.event_id = p_event_id
    and res.runner_id = r.id;

  with deltas as (
    select id, (level_before - public.results.level_after) as delta
    from public.results
    where event_id = p_event_id
  ),
  best as (
    select id from deltas where delta > 0 order by delta desc limit 1
  )
  update public.results
  set is_most_improved = true
  where id in (select id from best);

  update public.runners r
  set streak_count = r.streak_count + 1
  from _commit_ranked cr
  where r.id = cr.runner_id;

  update public.events
  set status = 'completed'
  where id = p_event_id;

  return query
  select res.runner_id, res.finish_position, res.level_after, res.is_personal_best
  from public.results res
  where res.event_id = p_event_id;
end;
$$;

grant execute on function public.commit_event_results(uuid, jsonb) to authenticated;
