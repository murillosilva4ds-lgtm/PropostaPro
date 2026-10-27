import type { PlanTier } from "@/types/database";

export type PaidPlan = Extract<PlanTier, "pro" | "premium">;

type StripePriceEnvironment = Pick<NodeJS.ProcessEnv, "STRIPE_PRICE_PRO" | "STRIPE_PRICE_PREMIUM">;

export function parsePaidPlan(value: unknown): PaidPlan | null {
  return value === "pro" || value === "premium" ? value : null;
}

export function stripePriceIdForPlan(
  plan: unknown,
  environment: StripePriceEnvironment = {
    STRIPE_PRICE_PRO: process.env.STRIPE_PRICE_PRO,
    STRIPE_PRICE_PREMIUM: process.env.STRIPE_PRICE_PREMIUM
  }
): string | null {
  const paidPlan = parsePaidPlan(plan);
  if (paidPlan === "pro") return environment.STRIPE_PRICE_PRO || null;
  if (paidPlan === "premium") return environment.STRIPE_PRICE_PREMIUM || null;
  return null;
}

export function entitledPlanForSubscription(status: string, plan: unknown): PlanTier {
  const paidPlan = parsePaidPlan(plan);
  return (status === "active" || status === "trialing") && paidPlan ? paidPlan : "gratuito";
}

export function checkoutPaymentIsComplete(paymentStatus: string, mode: string): boolean {
  return mode === "subscription" && (paymentStatus === "paid" || paymentStatus === "no_payment_required");
}
