-- Security hardening migration. Run once after schema.sql.
-- No application data is deleted by this migration.

-- Keep the signup trigger safe from objects shadowed through search_path.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nome)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'nome', ''),
      nullif(pg_catalog.split_part(coalesce(new.email, ''), '@', 1), ''),
      'Usuário'
    )
  );

  insert into public.subscriptions (user_id, plano, status)
  values (new.id, 'gratuito', 'ativa');

  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

create or replace function public.ensure_current_profile()
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_claims jsonb := auth.jwt();
  v_profile public.profiles;
  v_nome text;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  v_nome := coalesce(
    nullif(v_claims -> 'user_metadata' ->> 'nome', ''),
    nullif(pg_catalog.split_part(coalesce(v_claims ->> 'email', ''), '@', 1), ''),
    'Usuário'
  );

  insert into public.profiles (id, nome)
    values (v_user_id, v_nome)
    on conflict (id) do nothing;
  insert into public.subscriptions (user_id, plano, status)
    values (v_user_id, 'gratuito', 'ativa')
    on conflict (user_id) do nothing;

  select * into v_profile from public.profiles where id = v_user_id;
  return v_profile;
end;
$$;
revoke all on function public.ensure_current_profile() from public, anon;
grant execute on function public.ensure_current_profile() to authenticated;

-- User-editable profile fields only. Plan and usage fields remain server-managed.
revoke update on table public.profiles from public, anon, authenticated;
grant update (nome, telefone, empresa, cnpj) on table public.profiles to authenticated;

-- Proposal creation and item replacement must pass through authenticated API routes.
revoke insert on table public.proposals from public, anon, authenticated;
revoke update on table public.proposals from public, anon, authenticated;
alter table public.proposals alter column slug_publico set default encode(gen_random_bytes(16), 'hex');
alter table public.proposals alter column cor_tema set default '#f52f78';
alter table public.brand_settings alter column cor_primaria set default '#f52f78';

revoke insert, update, delete on table public.proposal_items from public, anon, authenticated;
revoke insert, update, delete on table public.subscriptions from public, anon, authenticated;

-- The public proposal view is read only through the server-side service-role route.
revoke all on table public.public_proposal_view from public, anon, authenticated;
grant select on table public.public_proposal_view to service_role;

-- Idempotency ledger for Stripe webhooks.
create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_until timestamptz not null default now()
);
alter table public.stripe_webhook_events add column if not exists processed_at timestamptz;
alter table public.stripe_webhook_events add column if not exists processing_until timestamptz not null default now();
alter table public.stripe_webhook_events enable row level security;
revoke all on table public.stripe_webhook_events from public, anon, authenticated;
grant all on table public.stripe_webhook_events to service_role;

-- Temporary reservations keep concurrent proposal requests within plan limits.
create table if not exists public.usage_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  usage_kind text not null check (usage_kind = 'proposal'),
  created_at timestamptz not null default now()
);
alter table public.usage_reservations enable row level security;
revoke all on table public.usage_reservations from public, anon, authenticated;
grant all on table public.usage_reservations to service_role;

create table if not exists public.user_api_rate_limits (
  user_id uuid not null references public.profiles (id) on delete cascade,
  bucket text not null check (bucket in ('checkout', 'ai')),
  window_started_at timestamptz not null,
  request_count integer not null default 1,
  primary key (user_id, bucket)
);
alter table public.user_api_rate_limits enable row level security;
revoke all on table public.user_api_rate_limits from public, anon, authenticated;
grant all on table public.user_api_rate_limits to service_role;

create table if not exists public.admin_plan_grants (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  plan public.plan_tier not null check (plan in ('pro', 'premium')),
  reason text not null check (char_length(btrim(reason)) between 3 and 500),
  granted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.admin_plan_grants enable row level security;
revoke all on table public.admin_plan_grants from public, anon, authenticated;
grant all on table public.admin_plan_grants to service_role;

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users (id) on delete set null,
  target_user_id uuid not null,
  action text not null check (action in ('plan_changed', 'password_reset_requested', 'user_deleted')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_audit_logs enable row level security;
revoke all on table public.admin_audit_logs from public, anon, authenticated;
grant all on table public.admin_audit_logs to service_role;

create or replace function public.has_active_admin_plan_grant()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_plan_grants g
    where g.user_id = auth.uid()
  );
$$;

create or replace function public.set_admin_plan_grant(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_plan public.plan_tier,
  p_reason text
)
returns public.plan_tier
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_effective_plan public.plan_tier;
begin
  if p_plan not in ('gratuito', 'pro', 'premium') then
    raise exception using errcode = '22023', message = 'invalid_plan';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 3 or char_length(p_reason) > 500 then
    raise exception using errcode = '22023', message = 'invalid_reason';
  end if;
  if not exists (select 1 from public.profiles where id = p_target_user_id) then
    raise exception using errcode = 'P0002', message = 'user_not_found';
  end if;

  if p_plan = 'gratuito' then
    delete from public.admin_plan_grants where user_id = p_target_user_id;
    select case
      when s.gateway = 'stripe' and s.status in ('ativa', 'em_teste') and s.plano in ('pro', 'premium') then s.plano
      else 'gratuito'::public.plan_tier
    end into v_effective_plan
    from public.subscriptions s
    where s.user_id = p_target_user_id;
    v_effective_plan := coalesce(v_effective_plan, 'gratuito'::public.plan_tier);
  else
    insert into public.admin_plan_grants (user_id, plan, reason, granted_by)
    values (p_target_user_id, p_plan, btrim(p_reason), p_actor_user_id)
    on conflict (user_id) do update
      set plan = excluded.plan,
          reason = excluded.reason,
          granted_by = excluded.granted_by,
          updated_at = now();
    v_effective_plan := p_plan;
  end if;

  update public.profiles set plano = v_effective_plan where id = p_target_user_id;
  insert into public.admin_audit_logs (actor_user_id, target_user_id, action, details)
  values (
    p_actor_user_id,
    p_target_user_id,
    'plan_changed',
    jsonb_build_object('requested_plan', p_plan, 'effective_plan', v_effective_plan, 'reason', btrim(p_reason))
  );
  return v_effective_plan;
end;
$$;

revoke all on function public.has_active_admin_plan_grant() from public, anon;
grant execute on function public.has_active_admin_plan_grant() to authenticated;
revoke all on function public.set_admin_plan_grant(uuid, uuid, public.plan_tier, text) from public, anon, authenticated;
grant execute on function public.set_admin_plan_grant(uuid, uuid, public.plan_tier, text) to service_role;

create or replace function public.consume_user_api_rate_limit(p_bucket text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer;
  v_window interval := interval '1 minute';
  v_started timestamptz;
  v_count integer;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  v_limit := case p_bucket
    when 'checkout' then 3
    when 'ai' then 10
    else null
  end;
  if v_limit is null then
    raise exception using errcode = '22023', message = 'rate_limit_bucket_invalid';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text || ':' || p_bucket, 0));

  select window_started_at, request_count into v_started, v_count
    from public.user_api_rate_limits
    where user_id = v_user_id and bucket = p_bucket
    for update;

  if not found then
    insert into public.user_api_rate_limits (user_id, bucket, window_started_at, request_count)
      values (v_user_id, p_bucket, pg_catalog.now(), 1);
    return true;
  end if;

  if v_started <= pg_catalog.now() - v_window then
    update public.user_api_rate_limits
      set window_started_at = pg_catalog.now(), request_count = 1
      where user_id = v_user_id and bucket = p_bucket;
    return true;
  end if;

  if v_count >= v_limit then return false; end if;

  update public.user_api_rate_limits
    set request_count = request_count + 1
    where user_id = v_user_id and bucket = p_bucket;
  return true;
end;
$$;

drop policy if exists "Usuário registra eventos das próprias propostas" on public.proposal_events;
revoke insert, update, delete on table public.proposal_events from public, anon, authenticated;

drop policy if exists "Qualquer usuário autenticado lê os modelos" on public.templates;
drop policy if exists "Modelos conforme plano ativo" on public.templates;
create policy "Modelos conforme plano ativo"
  on public.templates for select
  using (
    auth.role() = 'authenticated'
    and (
      not exclusivo_premium
      or exists (
        select 1
        from public.profiles p
        join public.subscriptions s on s.user_id = p.id
        where p.id = auth.uid()
          and p.plano in ('pro', 'premium')
          and s.status in ('ativa', 'em_teste')
      )
      or public.has_active_admin_plan_grant()
    )
  );

-- Keep the public logo bucket bounded to image formats and 5 MB per file.
update storage.buckets
  set file_size_limit = 5242880,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
  where id = 'logos';

drop policy if exists "Usuário envia seu próprio logotipo" on storage.objects;
create policy "Usuário envia seu próprio logotipo"
  on storage.objects for insert
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and metadata ->> 'mimetype' in ('image/png', 'image/jpeg', 'image/webp')
  );

drop policy if exists "Usuário atualiza seu próprio logotipo" on storage.objects;
create policy "Usuário atualiza seu próprio logotipo"
  on storage.objects for update
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and metadata ->> 'mimetype' in ('image/png', 'image/jpeg', 'image/webp')
  );

create or replace function public.reserve_proposal_slot()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan public.plan_tier;
  v_used integer;
  v_cycle date;
  v_limit integer;
  v_reserved integer;
  v_reservation_id uuid;
  v_month date := pg_catalog.date_trunc('month', pg_catalog.now())::date;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  select
    case
      when g.plan is not null then g.plan
      when p.plano = 'gratuito' then 'gratuito'::public.plan_tier
      when s.status in ('ativa', 'em_teste') then p.plano
      else 'gratuito'::public.plan_tier
    end,
    p.propostas_criadas_no_mes,
    p.ciclo_atual_inicio
    into v_plan, v_used, v_cycle
    from public.profiles p
    left join public.subscriptions s on s.user_id = p.id
    left join public.admin_plan_grants g on g.user_id = p.id
    where p.id = v_user_id
    for update of p;

  if not found then
    raise exception using errcode = 'P0001', message = 'profile_not_found';
  end if;

  if v_cycle < v_month then
    update public.profiles
      set propostas_criadas_no_mes = 0,
          ia_usos_no_mes = 0,
          ciclo_atual_inicio = v_month
      where id = v_user_id;
    v_used := 0;
  end if;

  delete from public.usage_reservations
    where user_id = v_user_id
      and usage_kind = 'proposal'
      and created_at < pg_catalog.now() - interval '10 minutes';

  select pg_catalog.count(*)::integer into v_reserved
    from public.usage_reservations
    where user_id = v_user_id and usage_kind = 'proposal';

  v_limit := case v_plan
    when 'gratuito' then 3
    when 'pro' then 50
    when 'premium' then 200
  end;

  if v_used + v_reserved >= v_limit then
    raise exception using errcode = 'P0001', message = 'proposal_quota_exceeded';
  end if;

  insert into public.usage_reservations (user_id, usage_kind)
    values (v_user_id, 'proposal')
    returning id into v_reservation_id;

  return v_reservation_id;
end;
$$;

create or replace function public.complete_proposal_slot(p_reservation_id uuid, p_succeeded boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_deleted_id uuid;
  v_month date := pg_catalog.date_trunc('month', pg_catalog.now())::date;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  perform 1 from public.profiles where id = v_user_id for update;

  delete from public.usage_reservations
    where id = p_reservation_id and user_id = v_user_id
    returning id into v_deleted_id;

  if v_deleted_id is null then
    raise exception using errcode = 'P0001', message = 'reservation_not_found';
  end if;

  if p_succeeded then
    update public.profiles
      set propostas_criadas_no_mes = propostas_criadas_no_mes + 1,
          ciclo_atual_inicio = v_month
      where id = v_user_id;
  end if;
end;
$$;

create or replace function public.reserve_ai_usage()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan public.plan_tier;
  v_used integer;
  v_cycle date;
  v_limit integer;
  v_month date := pg_catalog.date_trunc('month', pg_catalog.now())::date;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  select
    case
      when g.plan is not null then g.plan
      when p.plano = 'gratuito' then 'gratuito'::public.plan_tier
      when s.status in ('ativa', 'em_teste') then p.plano
      else 'gratuito'::public.plan_tier
    end,
    p.ia_usos_no_mes,
    p.ciclo_atual_inicio
    into v_plan, v_used, v_cycle
    from public.profiles p
    left join public.subscriptions s on s.user_id = p.id
    left join public.admin_plan_grants g on g.user_id = p.id
    where p.id = v_user_id
    for update of p;

  if not found then
    raise exception using errcode = 'P0001', message = 'profile_not_found';
  end if;

  if v_cycle < v_month then
    update public.profiles
      set propostas_criadas_no_mes = 0,
          ia_usos_no_mes = 0,
          ciclo_atual_inicio = v_month
      where id = v_user_id;
    v_used := 0;
  end if;

  v_limit := case v_plan
    when 'gratuito' then 0
    when 'pro' then 20
    when 'premium' then 100
  end;

  if v_used >= v_limit then
    raise exception using errcode = 'P0001', message = 'ai_quota_exceeded';
  end if;

  update public.profiles
    set ia_usos_no_mes = ia_usos_no_mes + 1,
        ciclo_atual_inicio = v_month
    where id = v_user_id;
end;
$$;

revoke all on function public.reserve_proposal_slot() from public, anon;
revoke all on function public.complete_proposal_slot(uuid, boolean) from public, anon;
revoke all on function public.reserve_ai_usage() from public, anon;
revoke all on function public.consume_user_api_rate_limit(text) from public, anon;
grant execute on function public.reserve_proposal_slot() to authenticated;
grant execute on function public.complete_proposal_slot(uuid, boolean) to authenticated;
grant execute on function public.reserve_ai_usage() to authenticated;
grant execute on function public.consume_user_api_rate_limit(text) to authenticated;
