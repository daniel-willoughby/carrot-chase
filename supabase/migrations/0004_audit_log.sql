-- =============================================================================
-- Carrot Chase — Audit log
-- =============================================================================
-- Append-only record of sensitive actions, especially Super Admin destructive
-- ones (organisation status changes, deletions, role grants). Intended for
-- compliance evidence and forensic review.
--
-- Insertion is via the `log_audit_event` RPC (security-definer) so callers
-- never need direct INSERT privileges. Reads are restricted to Super Admins.
-- =============================================================================

create table public.audit_log (
  id uuid primary key default extensions.gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_role public.user_role,
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_actor_idx on public.audit_log (actor_id, created_at desc);
create index audit_log_target_idx on public.audit_log (target_table, target_id);
create index audit_log_action_idx on public.audit_log (action, created_at desc);

alter table public.audit_log enable row level security;

-- Only Super Admins can read; nobody can insert/update/delete directly.
create policy "super_admins read audit_log"
  on public.audit_log for select
  using (public.current_role_value() = 'super_admin');

revoke insert, update, delete on public.audit_log from authenticated, anon;
grant select on public.audit_log to authenticated;

-- RPC: log_audit_event ---------------------------------------------------------
-- Callers (server actions) invoke this rather than inserting directly. The
-- security-definer body bypasses the INSERT restriction above.
create or replace function public.log_audit_event(
  p_action text,
  p_target_table text default null,
  p_target_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_role public.user_role := public.current_role_value();
  v_id uuid;
begin
  insert into public.audit_log (actor_id, actor_role, action, target_table, target_id, metadata)
  values (v_actor, v_role, p_action, p_target_table, p_target_id, p_metadata)
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.log_audit_event(text, text, uuid, jsonb) to authenticated;
