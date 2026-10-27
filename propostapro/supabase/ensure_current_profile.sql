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
    raise exception 'Authentication required';
  end if;

  v_nome := coalesce(
    nullif(v_claims -> 'user_metadata' ->> 'nome', ''),
    nullif(split_part(coalesce(v_claims ->> 'email', ''), '@', 1), ''),
    'Usuário'
  );

  insert into public.profiles (id, nome)
  values (v_user_id, v_nome)
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, plano, status)
  values (v_user_id, 'gratuito', 'ativa')
  on conflict (user_id) do nothing;

  select * into v_profile
  from public.profiles
  where id = v_user_id;

  return v_profile;
end;
$$;

revoke all on function public.ensure_current_profile() from public;
revoke all on function public.ensure_current_profile() from anon;
grant execute on function public.ensure_current_profile() to authenticated;
