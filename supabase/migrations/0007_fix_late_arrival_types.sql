-- Match runners.streak_count's actual column type (smallint, not int).
-- The previous declaration in 0006 caused
-- 42804 "structure of query does not match function result type".
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

  if not (
    exists (
      select 1 from public.group_leads gl
      where gl.group_id = p_group_id and gl.lead_id = auth.uid()
    )
    or public.is_school_admin()
    or public.is_super_admin()
  ) then
    raise exception 'not authorised to add runners to group %', p_group_id;
  end if;

  select g.organisation_id into v_org_id
  from public.groups g
  where g.id = p_group_id and g.deleted_at is null;

  if v_org_id is null then
    raise exception 'group % not found', p_group_id;
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
