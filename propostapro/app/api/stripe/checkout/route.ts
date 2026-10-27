import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { parsePaidPlan, stripePriceIdForPlan } from "@/lib/billing-policy";
import { PLAN_LIMITS } from "@/lib/plans";

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { erro: "Pagamentos ainda não configurados. Defina STRIPE_SECRET_KEY no ambiente para ativar o checkout." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { data: permitido, error: erroLimite } = await supabase.rpc("consume_user_api_rate_limit", { p_bucket: "checkout" });
  if (erroLimite) return NextResponse.json({ erro: "Não foi possível validar esta solicitação." }, { status: 500 });
  if (!permitido) return NextResponse.json({ erro: "Muitas tentativas. Aguarde um minuto e tente novamente." }, { status: 429 });

  const corpo = await request.json().catch(() => null);
  const plano = parsePaidPlan(corpo?.plano);
  if (!plano) return NextResponse.json({ erro: "Plano inválido." }, { status: 400 });

  const priceId = stripePriceIdForPlan(plano);

  if (!priceId) {
    return NextResponse.json({ erro: "Price ID do Stripe não configurado para este plano." }, { status: 503 });
  }

  let price;
  try {
    price = await stripe.prices.retrieve(priceId);
  } catch {
    return NextResponse.json({ erro: "Price ID do Stripe inválido." }, { status: 503 });
  }
  if (
    !price.active ||
    !price.recurring ||
    price.recurring.interval !== "month" ||
    price.recurring.interval_count !== 1 ||
    price.currency !== "brl" ||
    price.unit_amount !== Math.round(PLAN_LIMITS[plano].precoMensal * 100)
  ) {
    return NextResponse.json({ erro: "O preço configurado para este plano não corresponde ao catálogo." }, { status: 503 });
  }

  const { data: assinatura, error: erroAssinatura } = await supabase
    .from("subscriptions")
    .select("gateway, gateway_customer_id, gateway_subscription_id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (erroAssinatura) {
    return NextResponse.json({ erro: "Não foi possível verificar sua assinatura." }, { status: 500 });
  }
  if (!assinatura) {
    return NextResponse.json({ erro: "O perfil de assinatura ainda não foi criado. Entre em contato com o suporte." }, { status: 409 });
  }

  if (assinatura?.gateway_subscription_id && ["ativa", "em_teste"].includes(assinatura.status)) {
    return NextResponse.json(
      { erro: "Você já possui uma assinatura ativa. Cancele ou altere o plano atual antes de assinar novamente." },
      { status: 409 }
    );
  }

  let customerId = assinatura.gateway_customer_id ?? undefined;

  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, metadata: { user_id: user.id } });
    customerId = customer.id;
    const { data, error } = await createServiceRoleClient()
      .from("subscriptions")
      .update({ gateway: "stripe", gateway_customer_id: customerId })
      .eq("user_id", user.id)
      .select("user_id")
      .maybeSingle();
    if (error || !data) {
      await stripe.customers.del(customerId);
      return NextResponse.json({ erro: "Não foi possível preparar o checkout." }, { status: 500 });
    }
  }

  let appUrl: URL;
  try {
    appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "");
  } catch {
    return NextResponse.json({ erro: "URL pública do app não configurada." }, { status: 503 });
  }
  if (appUrl.protocol !== "https:" && !(appUrl.protocol === "http:" && appUrl.hostname === "localhost")) {
    return NextResponse.json({ erro: "URL pública do app inválida." }, { status: 503 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: new URL("/assinatura?sucesso=1", appUrl).toString(),
    cancel_url: new URL("/assinatura?cancelado=1", appUrl).toString(),
    client_reference_id: user.id,
    metadata: { user_id: user.id, plano },
    subscription_data: { metadata: { user_id: user.id, plano } }
  });

  return NextResponse.json({ url: session.url });
}
