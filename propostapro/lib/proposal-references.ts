import type { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type ProposalReferenceError = "profile_missing" | "client_not_owned" | "template_unavailable" | "lookup_failed";

export async function validateProposalReferences(
  supabase: ServerSupabaseClient,
  userId: string,
  clientId?: string | null,
  templateId?: string | null
): Promise<ProposalReferenceError | null> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("plano")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) return "lookup_failed";
  if (!profile) return "profile_missing";

  if (clientId) {
    const { data: client, error } = await supabase
      .from("clients")
      .select("id")
      .eq("id", clientId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return "lookup_failed";
    if (!client) return "client_not_owned";
  }

  if (templateId) {
    const { data: template, error } = await supabase
      .from("templates")
      .select("id, exclusivo_premium")
      .eq("id", templateId)
      .maybeSingle();
    if (error) return "lookup_failed";
    if (!template) return "template_unavailable";

    if (template.exclusivo_premium) {
      const { data: grant, error: grantError } = await supabase.rpc("has_active_admin_plan_grant");
      if (grantError) return "lookup_failed";

      if (!grant && profile.plano !== "gratuito") {
        const { data: subscription, error: subscriptionError } = await supabase
          .from("subscriptions")
          .select("status")
          .eq("user_id", userId)
          .maybeSingle();
        if (subscriptionError) return "lookup_failed";
        if (!subscription || !["ativa", "em_teste"].includes(subscription.status)) return "template_unavailable";
      } else if (!grant) {
        return "template_unavailable";
      }
    }
  }

  return null;
}
