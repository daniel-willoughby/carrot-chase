-- =============================================================================
-- 0008_reset_demo_data.sql
--
-- The prototype sidebar exposes a "Reset demo data" link for the demo
-- users — clicking it wipes any race results and sets every event back
-- to "scheduled" so the demo can be replayed from a clean state.
--
-- This RPC implements the server side. It runs SECURITY DEFINER and:
--   • requires the caller's email to end with @demo.carrotchase.com
--   • scopes the reset to the caller's organisation only
--   • clears results, flips events back to scheduled, blanks PBs and
--     resets streaks to 0 for runners in the org
-- =============================================================================

create or replace function public.reset_demo_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_org_id uuid;
begin
  if v_user_id is null then
    raise exception 'not signed in';
  end if;

  select email, organisation_id
    into v_email, v_org_id
  from public.profiles
  where id = v_user_id;

  if v_email is null or v_email not like '%@demo.carrotchase.com' then
    raise exception 'only @demo.carrotchase.com users may reset demo data';
  end if;

  if v_org_id is null then
    raise exception 'caller has no organisation to scope reset to';
  end if;

  -- Clear results for events belonging to this org.
  delete from public.results
  where event_id in (
    select e.id
    from public.events e
    join public.groups g on g.id = e.group_id
    where g.organisation_id = v_org_id
  );

  -- Reset events: anything completed / in_progress goes back to scheduled.
  update public.events e
  set status = 'scheduled'
  from public.groups g
  where g.id = e.group_id
    and g.organisation_id = v_org_id
    and e.status in ('completed', 'in_progress');

  -- Reset per-runner aggregates in the org.
  update public.runners
  set streak_count = 0,
      personal_best_seconds = null
  where organisation_id = v_org_id;
end;
$$;

grant execute on function public.reset_demo_data() to authenticated;
