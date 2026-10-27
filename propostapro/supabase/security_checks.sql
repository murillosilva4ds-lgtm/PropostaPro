-- Run after schema.sql and security_hardening.sql in the Supabase SQL Editor.
do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_class
    where oid = 'public.profiles'::regclass and relrowsecurity
  ) then
    raise exception 'RLS is not enabled on profiles';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_class
    where oid = 'public.proposals'::regclass and relrowsecurity
  ) then
    raise exception 'RLS is not enabled on proposals';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_class
    where oid = 'public.clients'::regclass and relrowsecurity
  ) then
    raise exception 'RLS is not enabled on clients';
  end if;
  if has_column_privilege('authenticated', 'public.profiles', 'plano', 'UPDATE') then
    raise exception 'Authenticated role can update profiles.plano';
  end if;
  if has_column_privilege('authenticated', 'public.profiles', 'propostas_criadas_no_mes', 'UPDATE') then
    raise exception 'Authenticated role can update proposal quota';
  end if;
  if has_table_privilege('authenticated', 'public.proposals', 'INSERT') then
    raise exception 'Authenticated role can insert proposals directly';
  end if;
  if has_column_privilege('authenticated', 'public.proposals', 'status', 'UPDATE') then
    raise exception 'Authenticated role can update proposal status directly';
  end if;
  if has_column_privilege('authenticated', 'public.proposals', 'valor_total', 'UPDATE') then
    raise exception 'Authenticated role can update proposal totals directly';
  end if;
  if has_table_privilege('authenticated', 'public.proposal_items', 'INSERT') then
    raise exception 'Authenticated role can insert proposal items directly';
  end if;
  if has_table_privilege('authenticated', 'public.subscriptions', 'UPDATE') then
    raise exception 'Authenticated role can update subscriptions';
  end if;
  if has_table_privilege('authenticated', 'public.proposal_events', 'INSERT') then
    raise exception 'Authenticated role can insert proposal events directly';
  end if;
  if has_table_privilege('authenticated', 'public.admin_plan_grants', 'SELECT') then
    raise exception 'Authenticated role can read admin plan grants';
  end if;
  if has_table_privilege('authenticated', 'public.admin_audit_logs', 'SELECT') then
    raise exception 'Authenticated role can read admin audit logs';
  end if;
  if has_function_privilege('authenticated', 'public.set_admin_plan_grant(uuid, uuid, public.plan_tier, text)', 'EXECUTE') then
    raise exception 'Authenticated role can change admin plan grants';
  end if;
  if not has_function_privilege('service_role', 'public.set_admin_plan_grant(uuid, uuid, public.plan_tier, text)', 'EXECUTE') then
    raise exception 'Service role cannot change admin plan grants';
  end if;
  if has_table_privilege('anon', 'public.public_proposal_view', 'SELECT') then
    raise exception 'Anonymous role can query the proposal view directly';
  end if;
  if has_function_privilege('anon', 'public.reserve_proposal_slot()', 'EXECUTE') then
    raise exception 'Anonymous role can reserve paid usage';
  end if;
  if not has_function_privilege('authenticated', 'public.reserve_proposal_slot()', 'EXECUTE') then
    raise exception 'Authenticated role cannot reserve proposal usage';
  end if;
  raise notice 'Security grants and RLS checks passed';
end;
$$;
