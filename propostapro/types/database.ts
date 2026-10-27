export type PlanTier = "gratuito" | "pro" | "premium";
export type ProposalStatus = "rascunho" | "enviada" | "aprovada" | "recusada" | "expirada";
export type SubscriptionStatus = "ativa" | "cancelada" | "inadimplente" | "em_teste";

export interface Profile {
  id: string;
  nome: string;
  telefone: string | null;
  empresa: string | null;
  cnpj: string | null;
  foto_url: string | null;
  plano: PlanTier;
  propostas_criadas_no_mes: number;
  ia_usos_no_mes: number;
  ciclo_atual_inicio: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  empresa: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrandSettings {
  id: string;
  user_id: string;
  nome_empresa: string | null;
  logo_url: string | null;
  cor_primaria: string | null;
  cor_secundaria: string | null;
  site: string | null;
  instagram: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProposalItem {
  id: string;
  proposal_id: string;
  nome: string;
  descricao: string | null;
  quantidade: number;
  valor_unitario: number;
  desconto: number;
  ordem: number;
}

export interface Proposal {
  id: string;
  user_id: string;
  client_id: string | null;
  template_id: string | null;
  nome_projeto: string;
  cliente_nome: string;
  cliente_email: string | null;
  cliente_telefone: string | null;
  data_emissao: string;
  validade_dias: number;
  prazo_execucao: string | null;
  data_entrega_prevista: string | null;
  condicoes_pagamento: string | null;
  numero_parcelas: number;
  entrada_valor: number;
  garantias: string | null;
  observacoes: string | null;
  escopo: string | null;
  itens_nao_inclusos: string | null;
  cor_tema: string;
  assinatura_nome: string | null;
  assinatura_cargo: string | null;
  subtotal: number;
  desconto_total: number;
  taxas: number;
  valor_total: number;
  status: ProposalStatus;
  slug_publico: string;
  visualizada_em: string | null;
  created_at: string;
  updated_at: string;
  items?: ProposalItem[];
}

export interface Template {
  id: string;
  slug: string;
  categoria: string;
  titulo: string;
  descricao: string | null;
  campos_sugeridos: { servicos_exemplo?: string[] };
  exclusivo_premium: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  plano: PlanTier;
  status: SubscriptionStatus;
  gateway: string | null;
  gateway_customer_id: string | null;
  gateway_subscription_id: string | null;
  periodo_atual_fim: string | null;
}

export interface ProposalEvent {
  id: string;
  proposal_id: string;
  tipo: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface StripeWebhookEvent {
  event_id: string;
  event_type: string;
  received_at: string;
}

export interface UsageReservation {
  id: string;
  user_id: string;
  usage_kind: "proposal";
  created_at: string;
}

export interface UserApiRateLimit {
  user_id: string;
  bucket: "checkout" | "ai";
  window_started_at: string;
  request_count: number;
}

export interface AdminPlanGrant {
  user_id: string;
  plan: Extract<PlanTier, "pro" | "premium">;
  reason: string;
  granted_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminAuditLog {
  id: string;
  actor_user_id: string | null;
  target_user_id: string;
  action: "plan_changed" | "password_reset_requested" | "user_deleted";
  details: Record<string, unknown>;
  created_at: string;
}

type EmptyRpcArgs = Record<PropertyKey, never>;

export interface PublicProposalView {
  id: string;
  slug_publico: string;
  nome_projeto: string;
  cliente_nome: string;
  data_emissao: string;
  validade_dias: number;
  prazo_execucao: string | null;
  data_entrega_prevista: string | null;
  condicoes_pagamento: string | null;
  numero_parcelas: number | null;
  entrada_valor: number | null;
  garantias: string | null;
  observacoes: string | null;
  escopo: string | null;
  itens_nao_inclusos: string | null;
  cor_tema: string | null;
  assinatura_nome: string | null;
  assinatura_cargo: string | null;
  subtotal: number;
  desconto_total: number;
  taxas: number;
  valor_total: number;
  status: ProposalStatus;
  nome_empresa: string | null;
  logo_url: string | null;
  cor_primaria: string | null;
  site: string | null;
  instagram: string | null;
}

type TableDefinition<Row> = {
  Row: Row & Record<string, unknown>;
  Insert: Partial<Row> & Record<string, unknown>;
  Update: Partial<Row> & Record<string, unknown>;
  Relationships: [];
};

// Tipo simplificado — substitua pelo tipo gerado via
// `supabase gen types typescript` para checagem completa em build time.
export type Database = {
  public: {
    Enums: {
      plan_tier: PlanTier;
      proposal_status: ProposalStatus;
      subscription_status: SubscriptionStatus;
    };
    Functions: {
      ensure_current_profile: { Args: EmptyRpcArgs; Returns: Profile };
      reserve_proposal_slot: { Args: EmptyRpcArgs; Returns: string };
      complete_proposal_slot: { Args: { p_reservation_id: string; p_succeeded: boolean }; Returns: undefined };
      reserve_ai_usage: { Args: EmptyRpcArgs; Returns: undefined };
      consume_user_api_rate_limit: { Args: { p_bucket: string }; Returns: boolean };
      has_active_admin_plan_grant: { Args: EmptyRpcArgs; Returns: boolean };
      set_admin_plan_grant: {
        Args: { p_actor_user_id: string; p_target_user_id: string; p_plan: PlanTier; p_reason: string };
        Returns: PlanTier;
      };
    };
    Tables: {
      profiles: TableDefinition<Profile>;
      brand_settings: TableDefinition<BrandSettings>;
      clients: TableDefinition<Client>;
      proposals: TableDefinition<Proposal>;
      proposal_items: TableDefinition<ProposalItem>;
      proposal_events: TableDefinition<ProposalEvent>;
      stripe_webhook_events: TableDefinition<StripeWebhookEvent>;
      templates: TableDefinition<Template>;
      subscriptions: TableDefinition<Subscription>;
      usage_reservations: TableDefinition<UsageReservation>;
      user_api_rate_limits: TableDefinition<UserApiRateLimit>;
      admin_plan_grants: TableDefinition<AdminPlanGrant>;
      admin_audit_logs: TableDefinition<AdminAuditLog>;
    };
    Views: {
      public_proposal_view: {
        Row: PublicProposalView & Record<string, unknown>;
        Relationships: [];
      };
    };
    CompositeTypes: Record<string, never>;
  };
};
