-- =========================================================
-- PropostaPro — Schema do banco de dados (Supabase / PostgreSQL)
-- Execute este arquivo no SQL Editor do Supabase (ou via supabase db push)
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------
create type plan_tier as enum ('gratuito', 'pro', 'premium');
create type proposal_status as enum ('rascunho', 'enviada', 'aprovada', 'recusada', 'expirada');
create type subscription_status as enum ('ativa', 'cancelada', 'inadimplente', 'em_teste');

-- ---------------------------------------------------------
-- PROFILES (dados complementares de cada usuário)
-- ---------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  telefone text,
  empresa text,
  cnpj text,
  foto_url text,
  plano plan_tier not null default 'gratuito',
  propostas_criadas_no_mes int not null default 0,
  ia_usos_no_mes int not null default 0,
  ciclo_atual_inicio date not null default date_trunc('month', now()),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- BRAND SETTINGS (identidade visual usada nas propostas/PDF)
-- ---------------------------------------------------------
create table public.brand_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  nome_empresa text,
  logo_url text,
  cor_primaria text default '#f52f78',
  cor_secundaria text default '#111827',
  site text,
  instagram text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

-- ---------------------------------------------------------
-- CLIENTS
-- ---------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  nome text not null,
  email text,
  telefone text,
  empresa text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- TEMPLATES (modelos por profissão)
-- ---------------------------------------------------------
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  categoria text not null, -- ex: 'sites', 'design', 'video', 'fotografia', 'trafego', 'social', 'sistemas', 'consultoria'
  titulo text not null,
  descricao text,
  campos_sugeridos jsonb not null default '{}'::jsonb,
  exclusivo_premium boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- PROPOSALS
-- ---------------------------------------------------------
create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  template_id uuid references public.templates (id) on delete set null,

  -- Etapa 1
  nome_projeto text not null,
  cliente_nome text not null,
  cliente_email text,
  cliente_telefone text,
  data_emissao date not null default current_date,
  validade_dias int not null default 15,

  -- Etapa 3
  prazo_execucao text,
  data_entrega_prevista date,
  condicoes_pagamento text,
  numero_parcelas int default 1,
  entrada_valor numeric(12,2) default 0,
  garantias text,
  observacoes text,
  escopo text,
  itens_nao_inclusos text,

  -- Etapa 4
  cor_tema text default '#f52f78',
  assinatura_nome text,
  assinatura_cargo text,

  -- Totais (derivados dos itens, recalculados na API)
  subtotal numeric(12,2) not null default 0,
  desconto_total numeric(12,2) not null default 0,
  taxas numeric(12,2) not null default 0,
  valor_total numeric(12,2) not null default 0,

  status proposal_status not null default 'rascunho',
  slug_publico text not null unique default encode(gen_random_bytes(8), 'hex'),
  visualizada_em timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index proposals_user_id_idx on public.proposals (user_id);
create index proposals_status_idx on public.proposals (status);

-- ---------------------------------------------------------
-- PROPOSAL ITEMS (serviços/produtos de cada proposta)
-- ---------------------------------------------------------
create table public.proposal_items (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  nome text not null,
  descricao text,
  quantidade numeric(10,2) not null default 1,
  valor_unitario numeric(12,2) not null default 0,
  desconto numeric(12,2) not null default 0,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create index proposal_items_proposal_id_idx on public.proposal_items (proposal_id);

-- ---------------------------------------------------------
-- SUBSCRIPTIONS (controle de plano / cobrança recorrente)
-- ---------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plano plan_tier not null default 'gratuito',
  status subscription_status not null default 'ativa',
  gateway text, -- 'stripe' | 'mercado_pago'
  gateway_customer_id text,
  gateway_subscription_id text,
  periodo_atual_fim timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

-- ---------------------------------------------------------
-- EVENTS (histórico: visualizações, mudanças de status etc.)
-- ---------------------------------------------------------
create table public.proposal_events (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  tipo text not null, -- 'criada' | 'editada' | 'enviada' | 'visualizada' | 'aprovada' | 'recusada' | 'expirada'
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index proposal_events_proposal_id_idx on public.proposal_events (proposal_id);

-- =========================================================
-- FUNÇÃO + TRIGGER: criar profile automaticamente no cadastro
-- =========================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)));

  insert into public.subscriptions (user_id, plano, status)
  values (new.id, 'gratuito', 'ativa');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================
-- FUNÇÃO: recalcular totais da proposta a partir dos itens
-- =========================================================
create or replace function public.recalcular_totais_proposta()
returns trigger
language plpgsql
as $$
declare
  v_proposal_id uuid;
  v_subtotal numeric(12,2);
  v_desconto numeric(12,2);
begin
  v_proposal_id := coalesce(new.proposal_id, old.proposal_id);

  select
    coalesce(sum(quantidade * valor_unitario), 0),
    coalesce(sum(desconto), 0)
  into v_subtotal, v_desconto
  from public.proposal_items
  where proposal_id = v_proposal_id;

  update public.proposals
  set
    subtotal = v_subtotal,
    desconto_total = v_desconto,
    valor_total = v_subtotal - v_desconto + taxas,
    updated_at = now()
  where id = v_proposal_id;

  return null;
end;
$$;

create trigger trg_recalcular_totais
  after insert or update or delete on public.proposal_items
  for each row execute procedure public.recalcular_totais_proposta();

-- =========================================================
-- RLS — cada usuário só acessa os próprios dados
-- =========================================================
alter table public.profiles enable row level security;
alter table public.brand_settings enable row level security;
alter table public.clients enable row level security;
alter table public.proposals enable row level security;
alter table public.proposal_items enable row level security;
alter table public.subscriptions enable row level security;
alter table public.proposal_events enable row level security;
alter table public.templates enable row level security;

-- PROFILES
create policy "Usuário vê e edita o próprio perfil"
  on public.profiles for select using (auth.uid() = id);
create policy "Usuário atualiza o próprio perfil"
  on public.profiles for update using (auth.uid() = id);

-- BRAND SETTINGS
create policy "Usuário gerencia sua própria marca"
  on public.brand_settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- CLIENTS
create policy "Usuário gerencia seus próprios clientes"
  on public.clients for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- PROPOSALS
create policy "Usuário gerencia suas próprias propostas"
  on public.proposals for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Leitura pública da proposta pelo slug (via view segura, não pela tabela diretamente)
-- Ver view public_proposals abaixo.

-- PROPOSAL ITEMS (acesso via proposta pai)
create policy "Usuário gerencia itens das próprias propostas"
  on public.proposal_items for all
  using (exists (
    select 1 from public.proposals p
    where p.id = proposal_items.proposal_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.proposals p
    where p.id = proposal_items.proposal_id and p.user_id = auth.uid()
  ));

-- SUBSCRIPTIONS
create policy "Usuário vê a própria assinatura"
  on public.subscriptions for select using (auth.uid() = user_id);

-- PROPOSAL EVENTS
create policy "Usuário vê eventos das próprias propostas"
  on public.proposal_events for select
  using (exists (
    select 1 from public.proposals p
    where p.id = proposal_events.proposal_id and p.user_id = auth.uid()
  ));

-- TEMPLATES (leitura pública para todos os usuários autenticados)
create policy "Qualquer usuário autenticado lê os modelos"
  on public.templates for select using (auth.role() = 'authenticated');

-- =========================================================
-- VIEW pública (somente campos necessários) para a página /p/[slug]
-- Acessada com a anon key através de uma Route Handler server-side,
-- nunca diretamente pelo cliente com permissões amplas.
-- =========================================================
create view public.public_proposal_view as
select
  p.id, p.slug_publico, p.nome_projeto, p.cliente_nome, p.data_emissao,
  p.validade_dias, p.prazo_execucao, p.data_entrega_prevista,
  p.condicoes_pagamento, p.numero_parcelas, p.entrada_valor,
  p.garantias, p.observacoes, p.escopo, p.itens_nao_inclusos,
  p.cor_tema, p.assinatura_nome, p.assinatura_cargo,
  p.subtotal, p.desconto_total, p.taxas, p.valor_total, p.status,
  b.nome_empresa, b.logo_url, b.cor_primaria, b.site, b.instagram
from public.proposals p
left join public.brand_settings b on b.user_id = p.user_id;

-- =========================================================
-- Seed inicial de modelos por profissão
-- =========================================================
insert into public.templates (slug, categoria, titulo, descricao, campos_sugeridos, exclusivo_premium) values
('sites-landing', 'sites', 'Criação de Sites e Landing Pages', 'Modelo para propostas de desenvolvimento web e landing pages.', '{"servicos_exemplo": ["Design UI/UX", "Desenvolvimento front-end", "Integração de formulários", "Hospedagem e domínio"]}', false),
('design-grafico', 'design', 'Design Gráfico e Identidade Visual', 'Modelo para propostas de branding e identidade visual.', '{"servicos_exemplo": ["Logotipo", "Manual de marca", "Papelaria", "Posts para redes sociais"]}', false),
('video', 'video', 'Produção e Edição de Vídeos', 'Modelo para videomakers e produtoras.', '{"servicos_exemplo": ["Captação", "Edição", "Motion graphics", "Trilha sonora licenciada"]}', false),
('fotografia', 'fotografia', 'Fotografia e Eventos', 'Modelo para fotógrafos de eventos e ensaios.', '{"servicos_exemplo": ["Cobertura do evento", "Tratamento de imagens", "Álbum digital", "Entrega em nuvem"]}', false),
('trafego-pago', 'trafego', 'Gestão de Tráfego Pago', 'Modelo para gestores de tráfego.', '{"servicos_exemplo": ["Configuração de campanhas", "Gestão mensal", "Relatórios de performance", "Otimização de criativos"]}', false),
('social-media', 'social', 'Social Media e Marketing Digital', 'Modelo para social media e marketing de conteúdo.', '{"servicos_exemplo": ["Planejamento de conteúdo", "Criação de posts", "Gestão de comunidade", "Relatório mensal"]}', false),
('dev-sistemas', 'sistemas', 'Desenvolvimento de Sistemas', 'Modelo para desenvolvedores de software sob demanda.', '{"servicos_exemplo": ["Levantamento de requisitos", "Desenvolvimento", "Testes", "Suporte pós-entrega"]}', true),
('consultoria', 'consultoria', 'Consultoria e Prestação de Serviços', 'Modelo genérico para consultorias.', '{"servicos_exemplo": ["Diagnóstico inicial", "Plano de ação", "Execução", "Acompanhamento"]}', false);
