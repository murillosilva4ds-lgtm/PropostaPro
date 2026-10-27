# PropostaPro

Plataforma SaaS para criação de propostas comerciais profissionais, com exportação em PDF, modelos por profissão, assinaturas recorrentes e apoio de IA.

Construído com **Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase (Postgres/Auth/Storage) + Stripe + @react-pdf/renderer**.

> **Status:** MVP funcional priorizado conforme solicitado — autenticação, dashboard, criação/edição de propostas, cálculos automáticos e geração de PDF estão completos e prontos para uso. Assinaturas (Stripe) e IA (Anthropic) estão implementadas e funcionais, mas exigem que você configure suas próprias credenciais (ver abaixo) — nada é simulado.

---

## 1. Pré-requisitos

- Node.js 18.18+ (recomendado 20+)
- Uma conta no [Supabase](https://supabase.com) (plano gratuito já é suficiente para começar)
- Uma conta no [Stripe](https://stripe.com) (opcional no início — necessária para cobrar assinaturas)
- Uma chave de API da [Anthropic](https://console.anthropic.com) (opcional no início — necessária para os recursos de IA)

## 2. Instalação local

```bash
npm install
cp .env.example .env.local
# edite .env.local com suas credenciais (passo 3)
npm run dev
```

A aplicação sobe em `http://localhost:3000`.

## 3. Configurando o Supabase

1. Crie um novo projeto em [supabase.com](https://supabase.com).
2. Em **Project Settings > API**, copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (nunca exponha esta chave no frontend)
3. Abra o **SQL Editor** do Supabase e execute, nesta ordem:
   1. `supabase/schema.sql` — cria todas as tabelas, enums, triggers, políticas de RLS e o seed dos modelos por profissão.
   2. `supabase/storage.sql` — cria o bucket público `logos` e suas políticas de acesso.
  3. `supabase/ensure_current_profile.sql` — cria com segurança um perfil padrão caso uma conta existente ainda não tenha um.
  4. `supabase/security_hardening.sql` — restringe mutações privilegiadas, protege cotas e registra eventos de webhook de forma idempotente.
  5. `supabase/security_checks.sql` — executa verificações de grants/RLS após a migração.
4. Em **Authentication > Providers**, habilite **Email** (já vem ativo) e, se quiser login com Google, habilite **Google** e configure o Client ID/Secret do Google Cloud Console. A URL de callback a cadastrar no Google é `https://SEU_PROJETO.supabase.co/auth/v1/callback`.
5. Em **Authentication > URL Configuration**, defina a *Site URL* como a URL do seu deploy (ex.: `https://propostapro.vercel.app`) e adicione `http://localhost:3000` em *Redirect URLs* para desenvolvimento.
6. Para habilitar o painel administrativo, defina `ADMIN_EMAILS` com seu e-mail confirmado (lista separada por vírgulas) ou `ADMIN_USER_IDS` com IDs de usuários no `.env.local` e nas variáveis da Vercel. Essas variáveis são server-only.
7. Depois da migração `security_hardening.sql`, o admin pode conceder/remover planos manualmente, solicitar recuperação por e-mail e excluir usuários com confirmação. Grants administrativos são separados do Stripe e ficam registrados em `admin_audit_logs`.

Com isso, cadastro, login, recuperação de senha, banco de dados e isolamento de dados por usuário (RLS) já funcionam de ponta a ponta.

## 4. Configurando pagamentos (Stripe)

1. Crie uma conta no Stripe e ative o **modo de teste**.
2. Em **Developers > API keys**, copie a *Secret key* para `STRIPE_SECRET_KEY`.
3. Em **Product catalog**, crie dois produtos recorrentes mensais:
  - "PropostaPro Pro" — R$ 29,90/mês → copie o `price_id` para `STRIPE_PRICE_PRO`
  - "PropostaPro Premium" — R$ 59,90/mês → copie o `price_id` para `STRIPE_PRICE_PREMIUM`
4. Em **Developers > Webhooks**, adicione um endpoint apontando para `https://SEU_DOMINIO/api/stripe/webhook`, selecionando os eventos:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copie o *Signing secret* gerado para `STRIPE_WEBHOOK_SECRET`.
6. Para testar localmente, use a [Stripe CLI](https://stripe.com/docs/stripe-cli): `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

Até que `STRIPE_SECRET_KEY` esteja definida, a página de Assinatura continua funcionando normalmente, mas o botão de upgrade informa que o checkout ainda não está disponível — nenhum pagamento é simulado como aprovado.

> **Alternativa Mercado Pago:** o schema e os limites de plano já estão prontos para qualquer gateway. Para usar o Mercado Pago no lugar do Stripe, implemente `app/api/mercadopago/checkout` e `app/api/mercadopago/webhook` seguindo o mesmo padrão dos arquivos `app/api/stripe/*`, usando o SDK oficial (`mercadopago`) e as variáveis já previstas em `.env.example`.

## 5. Configurando a IA

1. Gere uma chave em [console.anthropic.com](https://console.anthropic.com).
2. Defina `ANTHROPIC_API_KEY` no `.env.local`.
3. Os botões "Melhorar com IA" no formulário de propostas passam a funcionar, respeitando a franquia mensal de cada plano (`lib/plans.ts`).

Sem a chave configurada, a rota de IA retorna um erro claro em vez de simular uma resposta.

## 6. Estrutura do projeto

```
app/
  (auth)/           # cadastro, login, recuperação de senha
  (dashboard)/       # área logada: dashboard, propostas, clientes, modelos, assinatura, perfil, admin
  api/                # rotas de backend (propostas, PDF, Stripe, IA)
  p/[slug]/           # página pública de visualização da proposta
components/
  dashboard/          # sidebar, tabela de propostas, clientes, planos, perfil
  propostas/          # wizard de criação/edição em 5 etapas
lib/
  supabase/           # clientes de browser, server e service-role
  pdf/                # template do documento PDF
  plans.ts            # limites de cada plano (fonte única de verdade, checada no backend)
supabase/
  schema.sql          # tabelas, triggers, RLS, seed de modelos
  storage.sql         # bucket de logotipos
```

## 7. Fluxos já implementados e testáveis

- Cadastro, login, logout e recuperação de senha
- Criação, edição, duplicação e exclusão de propostas
- Cálculo automático de subtotal, desconto e valor total (recalculado no banco via trigger)
- Geração e download de PDF profissional
- Link público de proposta, com registro de visualização (sem marcar aprovação automaticamente)
- Compartilhamento por WhatsApp
- Cadastro e reaproveitamento de clientes
- Biblioteca de modelos por profissão, com bloqueio de modelos exclusivos por plano
- Checkout de assinatura via Stripe e atualização de plano via webhook
- Geração de descrições/escopo via IA, com franquia mensal controlada no backend
- Isolamento completo de dados entre usuários via RLS do Postgres

## 8. Deploy na Vercel

1. Suba este repositório no GitHub/GitLab.
2. Importe o projeto na [Vercel](https://vercel.com/new).
3. Em **Settings > Environment Variables**, adicione todas as variáveis do `.env.example` com os valores de produção.
4. Defina `NEXT_PUBLIC_APP_URL` com a URL final do deploy (ex.: `https://propostapro.vercel.app`).
5. Atualize a *Site URL* e os *Redirect URLs* no Supabase para apontar para essa mesma URL.
6. Atualize a URL do webhook no Stripe para `https://SEU_DOMINIO/api/stripe/webhook`.
7. Faça o deploy — a Vercel detecta automaticamente o projeto Next.js.

## 9. Próximos passos sugeridos

- Histórico de versões completo de cada proposta (hoje o histórico é registrado como eventos em `proposal_events`; uma tabela de snapshots pode ser adicionada se for necessário comparar versões lado a lado).
- Notificações por e-mail (ex.: via Resend ou SendGrid) quando uma proposta é visualizada ou aprovada.
- Suporte a múltiplos idiomas na interface pública da proposta.
- Testes automatizados (Playwright para fluxos end-to-end, Vitest para funções utilitárias).
