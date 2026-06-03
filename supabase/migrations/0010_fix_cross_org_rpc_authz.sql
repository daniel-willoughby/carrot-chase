-- =============================================================================
-- 0010_fix_cross_org_rpc_authz.sql
--
-- SECURITY FIX: cross-organisation writes via SECURITY DEFINER RPCs.
--
-- commit_event_results (0009) and add_late_arrival (0006/0007) both run as
-- SECURITY DEFINER (owner = postgres), which bypasses RLS. Their in-function
-- authorisation accepted ANY school admin:
--
--     ... or public.is_school_admin() or ...
--
-- is_school_admin() only checks the caller's ROLE, not that the target event
-- /group belongs to the caller's organisation. Because RLS is bypassed inside
-- a definer function, nothing else constrained the write. Result:
--
--   • A school admin in Org A could commit/overwrite results for an Org B
--     event — rewriting other children's PBs, levels, streaks, medals and
--     flipping the event to "completed".
--   • A school admin in Org A could inject a "late arrival" runner into an
--     Org B group.
--
-- Fix: the school-admin branch must additionally verify the target's org
-- matches the caller's, using the existing public.belongs_to_organisation()
-- helper. (The lead branch was already correctly scoped — it requires the
-- caller to lead the specific target group. super_admin remains all-org by
-- design. reset_demo_data, 0008, already scopes correctly and is unchanged.)
--
-- Pure authorisation change — no behavioural change for legitimate callers.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- commit_event_results
-- ---------------------------------------------------------------------------
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
security definer
set search_path = public
as $$
declare
  v_course_distance int;
  v_group_id uuid;
  v_org_id uuid;
begin
  -- Lookup course distance + group + owning organisation for the event.
  select c.distance_metres, e.group_id, g.organisation_id
    into v_course_distance, v_group_id, v_org_id
  from public.events e
  join public.courses c on c.id = e.course_id
  join public.groups g on g.id = e.group_id
  where e.id = p_event_id;

  if v_course_distance is null then
    raise exception 'event % not found or has no course', p_event_id;
  end if;

  -- Authorisation: caller must lead this group, or be a school admin OF THIS
  -- ORGANISATION, or a super admin. The org check is the security fix.
  if not (
    exists (
      select 1 from public.group_leads gl
      where gl.group_id = v_group_id and gl.lead_id = auth.uid()
    )
    or (public.is_school_admin() and public.belongs_to_organisation(v_org_id))
    or public.is_super_admin()
  ) then
    raise exception 'not authorised to commit results for event %', p_event_id;
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

-- ---------------------------------------------------------------------------
-- add_late_arrival
-- ---------------------------------------------------------------------------
drop function if exists public.add_late_arrival(uuid, text);

create function public.add_late_arrival(
  p_group_id uuid,
  p_full_name text
) returns table(
  id uuid,
  full_name text,
  current_level smallint,
  streak_count smallint,
  personal_best_seconds numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_runner_id uuid;
  v_trim text := btrim(p_full_name);
begin
  if v_trim is null or length(v_trim) = 0 then
    raise exception 'name is required';
  end if;

  -- Resolve the group's owning organisation FIRST, so authorisation can be
  -- org-scoped. (Also rejects archived/missing groups before any write.)
  select g.organisation_id into v_org_id
  from public.groups g
  where g.id = p_group_id and g.deleted_at is null;

  if v_org_id is null then
    raise exception 'group % not found', p_group_id;
  end if;

  -- Authorisation: caller must lead this group, or be a school admin OF THIS
  -- ORGANISATION, or a super admin. The org check is the security fix.
  if not (
    exists (
      select 1 from public.group_leads gl
      where gl.group_id = p_group_id and gl.lead_id = auth.uid()
    )
    or (public.is_school_admin() and public.belongs_to_organisation(v_org_id))
    or public.is_super_admin()
  ) then
    raise exception 'not authorised to add runners to group %', p_group_id;
  end if;

  insert into public.runners (
    organisation_id, full_name, current_level, streak_count
  ) values (
    v_org_id, v_trim, 99, 0
  ) returning runners.id into v_runner_id;

  insert into public.runner_groups (runner_id, group_id)
  values (v_runner_id, p_group_id);

  return query
  select
    r.id,
    r.full_name,
    r.current_level,
    r.streak_count,
    r.personal_best_seconds
  from public.runners r
  where r.id = v_runner_id;
end;
$$;

grant execute on function public.add_late_arrival(uuid, text) to authenticated;
