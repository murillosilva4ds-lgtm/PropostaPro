import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { checkoutPaymentIsComplete, entitledPlanForSubscription, parsePaidPlan, stripePriceIdForPlan } from "@/lib/billing-policy";
import type Stripe from "stripe";

/**
 * Configure este endpoint no Stripe Dashboard > Developers > Webhooks:
 *   URL: https://SEU_DOMINIO/api/stripe/webhook
 *   Eventos: checkout.session.completed, checkout.session.async_payment_succeeded,
 *            customer.subscription.updated, customer.subscription.deleted,
 *            invoice.paid, invoice.payment_failed, charge.refunded
 * Copie o "Signing secret" gerado para STRIPE_WEBHOOK_SECRET no .env
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ erro: "Stripe não configurado." }, { status: 503 });
  }

  const assinatura = request.headers.get("stripe-signature");
  const corpo = await request.text();

  if (!assinatura) return NextResponse.json({ erro: "Assinatura do webhook ausente." }, { status: 400 });

  let evento: Stripe.Event;
  try {
    evento = stripe.webhooks.constructEvent(corpo, assinatura, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ erro: "Assinatura do webhook inválida." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const processingUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const { error: erroRegistro } = await supabase.from("stripe_webhook_events").insert({
    event_id: evento.id,
    event_type: evento.type,
    processing_until: processingUntil
  });

  if (erroRegistro?.code === "23505") {
    const { data: existente, error: erroBusca } = await supabase
      .from("stripe_webhook_events")
      .select("processed_at, processing_until")
      .eq("event_id", evento.id)
      .maybeSingle();
    if (erroBusca) return NextResponse.json({ erro: "Não foi possível verificar o evento." }, { status: 500 });
    if (existente?.processed_at) return NextResponse.json({ recebido: true, duplicado: true });

    const { data: reservaEvento, error: erroReserva } = await supabase
      .from("stripe_webhook_events")
      .update({ processing_until: processingUntil })
      .eq("event_id", evento.id)
      .is("processed_at", null)
      .lte("processing_until", new Date().toISOString())
      .select("event_id")
      .maybeSingle();
    if (erroReserva) return NextResponse.json({ erro: "Não foi possível reservar o evento." }, { status: 500 });
    if (!reservaEvento) return NextResponse.json({ erro: "Evento ainda está sendo processado." }, { status: 409 });
  }
  if (erroRegistro && erroRegistro.code !== "23505") {
    return NextResponse.json({ erro: "Não foi possível registrar o evento." }, { status: 500 });
  }

  try {
    switch (evento.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = evento.data.object as Stripe.Checkout.Session;
        const plano = parsePaidPlan(session.metadata?.plano);
        const userId = session.metadata?.user_id;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

        if (!plano || !userId || !customerId || !subscriptionId || !checkoutPaymentIsComplete(session.payment_status, session.mode)) {
          break;
        }

        if (session.client_reference_id !== userId) break;

        const assinaturaStripe = await stripe.subscriptions.retrieve(subscriptionId);
        const customerDaAssinatura = typeof assinaturaStripe.customer === "string"
          ? assinaturaStripe.customer
          : assinaturaStripe.customer.id;
        if (
          customerDaAssinatura !== customerId ||
          assinaturaStripe.metadata.user_id !== userId ||
          parsePaidPlan(assinaturaStripe.metadata.plano) !== plano ||
          assinaturaStripe.items.data.length !== 1 ||
          assinaturaStripe.items.data[0]?.quantity !== 1 ||
          assinaturaStripe.items.data[0]?.price.id !== stripePriceIdForPlan(plano)
        ) break;

        const planoAtivo = entitledPlanForSubscription(assinaturaStripe.status, plano);
        if (planoAtivo === "gratuito") break;

        const { data: registro, error: erroRegistroUsuario } = await supabase
          .from("subscriptions")
          .select("user_id, gateway_customer_id")
          .eq("user_id", userId)
          .maybeSingle();
        if (erroRegistroUsuario) throw erroRegistroUsuario;
        if (!registro || registro.gateway_customer_id !== customerId) break;

        const periodoFim = assinaturaStripe.current_period_end
          ? new Date(assinaturaStripe.current_period_end * 1000).toISOString()
          : null;
        const status = assinaturaStripe.status === "trialing" ? "em_teste" : "ativa";

        const { error: erroAtualizarAssinatura } = await supabase
          .from("subscriptions")
          .update({
            gateway: "stripe",
            gateway_subscription_id: subscriptionId,
            plano,
            status,
            periodo_atual_fim: periodoFim
          })
          .eq("user_id", userId);
        if (erroAtualizarAssinatura) throw erroAtualizarAssinatura;

        const { error: erroAtualizarPerfil } = await supabase.from("profiles").update({ plano: planoAtivo }).eq("id", userId);
        if (erroAtualizarPerfil) throw erroAtualizarPerfil;
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscriptionEvento = evento.data.object as Stripe.Subscription;
        const subscription = await stripe.subscriptions.retrieve(subscriptionEvento.id);
        const userId = subscription.metadata.user_id;
        const plano = parsePaidPlan(subscription.metadata.plano);
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
        if (
          !userId ||
          !plano ||
          subscription.items.data.length !== 1 ||
          subscription.items.data[0]?.quantity !== 1 ||
          subscription.items.data[0]?.price.id !== stripePriceIdForPlan(plano)
        ) break;

        const { data: registro, error: erroRegistroUsuario } = await supabase
          .from("subscriptions")
          .select("user_id, gateway_customer_id")
          .eq("user_id", userId)
          .maybeSingle();
        if (erroRegistroUsuario) throw erroRegistroUsuario;
        if (!registro || registro.gateway_customer_id !== customerId) break;

        const planoAcesso = entitledPlanForSubscription(subscription.status, plano);
        const status = subscription.status === "active"
          ? "ativa"
          : subscription.status === "trialing"
            ? "em_teste"
            : subscription.status === "canceled"
              ? "cancelada"
              : "inadimplente";
        const periodoFim = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;

        const { error: erroAtualizarAssinatura } = await supabase
          .from("subscriptions")
          .update({ gateway_subscription_id: subscription.id, plano, status, periodo_atual_fim: periodoFim })
          .eq("user_id", userId);
        if (erroAtualizarAssinatura) throw erroAtualizarAssinatura;

        const { error: erroAtualizarPerfil } = await supabase.from("profiles").update({ plano: planoAcesso }).eq("id", userId);
        if (erroAtualizarPerfil) throw erroAtualizarPerfil;
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = evento.data.object as Stripe.Subscription;
        const { data: registro, error: erroRegistroUsuario } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("gateway_subscription_id", subscription.id)
          .maybeSingle();
        if (erroRegistroUsuario) throw erroRegistroUsuario;

        if (registro) {
          const { error: erroAtualizarAssinatura } = await supabase
            .from("subscriptions")
            .update({ plano: "gratuito", status: "cancelada" })
            .eq("user_id", registro.user_id);
          if (erroAtualizarAssinatura) throw erroAtualizarAssinatura;
          const { error: erroAtualizarPerfil } = await supabase.from("profiles").update({ plano: "gratuito" }).eq("id", registro.user_id);
          if (erroAtualizarPerfil) throw erroAtualizarPerfil;
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = evento.data.object as Stripe.Invoice;
        const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const userId = subscription.metadata.user_id;
        const plano = parsePaidPlan(subscription.metadata.plano);
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
        if (!userId || !plano) break;

        const { data: registro, error: erroRegistroUsuario } = await supabase
          .from("subscriptions")
          .select("user_id, gateway_customer_id, gateway_subscription_id")
          .eq("user_id", userId)
          .maybeSingle();
        if (erroRegistroUsuario) throw erroRegistroUsuario;
        if (
          !registro ||
          registro.gateway_customer_id !== customerId ||
          registro.gateway_subscription_id !== subscription.id
        ) break;

        const planoAcesso = entitledPlanForSubscription(subscription.status, plano);
        const status = subscription.status === "active"
          ? "ativa"
          : subscription.status === "trialing"
            ? "em_teste"
            : subscription.status === "canceled"
              ? "cancelada"
              : "inadimplente";
        const periodoFim = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;

        const { error: erroAtualizarAssinatura } = await supabase
          .from("subscriptions")
          .update({ status, periodo_atual_fim: periodoFim })
          .eq("user_id", userId)
          .eq("gateway_subscription_id", subscription.id);
        if (erroAtualizarAssinatura) throw erroAtualizarAssinatura;

        const { error: erroAtualizarPerfil } = await supabase
          .from("profiles")
          .update({ plano: planoAcesso })
          .eq("id", userId);
        if (erroAtualizarPerfil) throw erroAtualizarPerfil;
        break;
      }
      case "invoice.paid": {
        const invoice = evento.data.object as Stripe.Invoice;
        const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const userId = subscription.metadata.user_id;
        const plano = parsePaidPlan(subscription.metadata.plano);
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
        if (
          !userId ||
          !plano ||
          entitledPlanForSubscription(subscription.status, plano) === "gratuito" ||
          subscription.items.data.length !== 1 ||
          subscription.items.data[0]?.quantity !== 1 ||
          subscription.items.data[0]?.price.id !== stripePriceIdForPlan(plano)
        ) break;

        const { data: registro, error: erroRegistroUsuario } = await supabase
          .from("subscriptions")
          .select("user_id, gateway_customer_id")
          .eq("user_id", userId)
          .maybeSingle();
        if (erroRegistroUsuario) throw erroRegistroUsuario;
        if (!registro || registro.gateway_customer_id !== customerId) break;

        const status = subscription.status === "trialing" ? "em_teste" : "ativa";
        const periodoFim = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;
        const { error: erroAtualizarAssinatura } = await supabase
          .from("subscriptions")
          .update({ gateway_subscription_id: subscription.id, plano, status, periodo_atual_fim: periodoFim })
          .eq("user_id", userId);
        if (erroAtualizarAssinatura) throw erroAtualizarAssinatura;

        const { error: erroAtualizarPerfil } = await supabase.from("profiles").update({ plano }).eq("id", userId);
        if (erroAtualizarPerfil) throw erroAtualizarPerfil;
        break;
      }
      case "charge.refunded": {
        const charge = evento.data.object as Stripe.Charge;
        if (charge.amount_refunded < charge.amount || !charge.invoice) break;

        const invoiceId = typeof charge.invoice === "string" ? charge.invoice : charge.invoice.id;
        const invoice = await stripe.invoices.retrieve(invoiceId);
        const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
        if (!subscriptionId) break;

        const subscriptionAtual = await stripe.subscriptions.retrieve(subscriptionId);
        const subscription = ["canceled", "incomplete_expired"].includes(subscriptionAtual.status)
          ? subscriptionAtual
          : await stripe.subscriptions.cancel(subscriptionId);
        const userId = subscription.metadata.user_id;
        if (!userId) break;

        const { data: registro, error: erroRegistroUsuario } = await supabase
          .from("subscriptions")
          .select("user_id, gateway_customer_id")
          .eq("user_id", userId)
          .maybeSingle();
        if (erroRegistroUsuario) throw erroRegistroUsuario;
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
        if (!registro || registro.gateway_customer_id !== customerId) break;

        const { error: erroAtualizarAssinatura } = await supabase
          .from("subscriptions")
          .update({ plano: "gratuito", status: "cancelada", gateway_subscription_id: subscription.id })
          .eq("user_id", userId);
        if (erroAtualizarAssinatura) throw erroAtualizarAssinatura;
        const { error: erroAtualizarPerfil } = await supabase.from("profiles").update({ plano: "gratuito" }).eq("id", userId);
        if (erroAtualizarPerfil) throw erroAtualizarPerfil;
        break;
      }
    }
  } catch {
    await supabase
      .from("stripe_webhook_events")
      .update({ processing_until: new Date().toISOString() })
      .eq("event_id", evento.id)
      .is("processed_at", null);
    return NextResponse.json({ erro: "Não foi possível processar o evento." }, { status: 500 });
  }

  const { error: erroConcluirEvento } = await supabase
    .from("stripe_webhook_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("event_id", evento.id)
    .is("processed_at", null);
  if (erroConcluirEvento) return NextResponse.json({ erro: "Não foi possível confirmar o evento." }, { status: 500 });

  return NextResponse.json({ recebido: true });
}
