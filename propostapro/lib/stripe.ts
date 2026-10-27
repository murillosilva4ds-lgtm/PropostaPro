import Stripe from "stripe";

/**
 * Instancia o Stripe apenas quando a chave está configurada, para que o app
 * continue funcionando (sem cobrança) enquanto as credenciais não existem.
 */
export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
}
