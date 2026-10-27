import assert from "node:assert/strict";
import test from "node:test";
import {
  checkoutPaymentIsComplete,
  entitledPlanForSubscription,
  parsePaidPlan,
  stripePriceIdForPlan
} from "../lib/billing-policy.ts";
import { aiRequestSchema } from "../lib/ai-request-schema.ts";
import { propostaSchema } from "../lib/proposal-schema.ts";
import { publicLogoUrl } from "../lib/supabase/public-logo-url.ts";
import { safeInternalRedirect } from "../lib/auth-redirect.ts";
import { isAdminIdentity } from "../lib/admin-policy.ts";

const validProposal = {
  clienteId: null,
  clienteNome: "Cliente Teste",
  clienteEmail: "cliente@example.com",
  clienteTelefone: "",
  nomeProjeto: "Projeto Teste",
  dataEmissao: "2026-10-25",
  validadeDias: 15,
  itens: [{ nome: "Serviço", descricao: "", quantidade: 1, valorUnitario: 100, desconto: 0 }],
  taxas: 0,
  prazoExecucao: "",
  dataEntregaPrevista: "",
  condicoesPagamento: "À vista",
  numeroParcelas: 1,
  entradaValor: 0,
  garantias: "",
  observacoes: "",
  escopo: "",
  itensNaoInclusos: "",
  templateId: null,
  corTema: "#7c4dff",
  assinaturaNome: "",
  assinaturaCargo: ""
};

test("checkout only accepts paid catalog plans and server price IDs", () => {
  assert.equal(parsePaidPlan("pro"), "pro");
  assert.equal(parsePaidPlan("premium"), "premium");
  assert.equal(parsePaidPlan("gratuito"), null);
  assert.equal(parsePaidPlan("999"), null);
  assert.equal(parsePaidPlan({ plano: "premium" }), null);
  assert.equal(
    stripePriceIdForPlan("premium", { STRIPE_PRICE_PREMIUM: "price_server" }),
    "price_server"
  );
  assert.equal(stripePriceIdForPlan("premium", { NEXT_PUBLIC_STRIPE_PRICE_PREMIUM: "price_client" }), null);
});

test("paid access requires an active or trialing Stripe subscription", () => {
  assert.equal(entitledPlanForSubscription("active", "pro"), "pro");
  assert.equal(entitledPlanForSubscription("trialing", "premium"), "premium");
  for (const status of ["incomplete", "past_due", "unpaid", "canceled", "incomplete_expired", "paused"]) {
    assert.equal(entitledPlanForSubscription(status, "premium"), "gratuito", status);
  }
  assert.equal(entitledPlanForSubscription("active", "untrusted"), "gratuito");
});

test("checkout does not grant access for pending or one-time sessions", () => {
  assert.equal(checkoutPaymentIsComplete("paid", "subscription"), true);
  assert.equal(checkoutPaymentIsComplete("no_payment_required", "subscription"), true);
  assert.equal(checkoutPaymentIsComplete("unpaid", "subscription"), false);
  assert.equal(checkoutPaymentIsComplete("paid", "payment"), false);
});

test("proposal payload rejects invalid or excessive values", () => {
  assert.equal(propostaSchema.safeParse(validProposal).success, true);
  assert.equal(propostaSchema.safeParse({ ...validProposal, status: "aprovada" }).data.status, undefined);
  assert.equal(propostaSchema.safeParse({ ...validProposal, validadeDias: -1 }).success, false);
  assert.equal(propostaSchema.safeParse({ ...validProposal, itens: Array(101).fill(validProposal.itens[0]) }).success, false);
  assert.equal(propostaSchema.safeParse({ ...validProposal, corTema: "javascript:alert(1)" }).success, false);
  assert.equal(propostaSchema.safeParse({ ...validProposal, clienteId: "another-users-id" }).success, false);
});

test("AI payload allowlists task types and caps prompt size", () => {
  assert.equal(aiRequestSchema.safeParse({ tipo: "descricao", contexto: "Logo" }).success, true);
  assert.equal(aiRequestSchema.safeParse({ tipo: "admin", contexto: "ignored" }).success, false);
  assert.equal(aiRequestSchema.safeParse({ tipo: "escopo", contexto: "x".repeat(4001) }).success, false);
});

test("server-rendered logos are restricted to this project's public logos bucket", () => {
  const projectUrl = "https://project.supabase.co";
  const validLogo = "https://project.supabase.co/storage/v1/object/public/logos/user/logo.png";
  assert.equal(publicLogoUrl(validLogo, projectUrl), validLogo);
  assert.equal(publicLogoUrl("https://attacker.example/logo.png", projectUrl), null);
  assert.equal(publicLogoUrl("https://project.supabase.co/storage/v1/object/public/other/logo.png", projectUrl), null);
  assert.equal(publicLogoUrl("https://user:pass@project.supabase.co/storage/v1/object/public/logos/logo.png", projectUrl), null);
});

test("post-login redirect remains on the same origin", () => {
  assert.equal(safeInternalRedirect("/propostas?pagina=2"), "/propostas?pagina=2");
  assert.equal(safeInternalRedirect("//attacker.example"), "/dashboard");
  assert.equal(safeInternalRedirect("https://attacker.example"), "/dashboard");
  assert.equal(safeInternalRedirect("javascript:alert(1)"), "/dashboard");
  assert.equal(safeInternalRedirect("/\\\\attacker.example"), "/dashboard");
});

test("admin access requires a configured ID or confirmed allowlisted email", () => {
  const environment = { ADMIN_EMAILS: "owner@example.com", ADMIN_USER_IDS: "admin-user-id" };
  assert.equal(isAdminIdentity({ id: "admin-user-id" }, environment), true);
  assert.equal(isAdminIdentity({ id: "other-id", email: "OWNER@example.com", email_confirmed_at: "now" }, environment), true);
  assert.equal(isAdminIdentity({ id: "other-id", email: "owner@example.com", email_confirmed_at: null }, environment), false);
  assert.equal(isAdminIdentity({ id: "other-id", email: "other@example.com", email_confirmed_at: "now" }, environment), false);
  assert.equal(isAdminIdentity(null, environment), false);
});
