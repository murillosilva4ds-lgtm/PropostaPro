import { createClient } from "@/lib/supabase/server";
import { PLAN_LIMITS } from "@/lib/plans";
import { PlanCard } from "@/components/dashboard/plan-card";

export default async function AssinaturaPage({
  searchParams
}: {
  searchParams: Promise<{ sucesso?: string; cancelado?: string }>;
}) {
  const parametros = await searchParams;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("plano, propostas_criadas_no_mes").eq("id", user!.id).single();

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold text-gray-900">Assinatura e planos</h1>
      <p className="mt-1 text-sm text-gray-500">Gerencie seu plano atual ou faça upgrade a qualquer momento.</p>

      {parametros.sucesso && (
        <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">Retorno do checkout recebido. O plano será atualizado após a confirmação do pagamento pelo Stripe.</p>
      )}
      {parametros.cancelado && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">Checkout cancelado. Nenhuma cobrança foi feita.</p>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {(Object.entries(PLAN_LIMITS) as [keyof typeof PLAN_LIMITS, (typeof PLAN_LIMITS)["gratuito"]][]).map(([chave, plano]) => (
          <PlanCard
            key={chave}
            chave={chave}
            plano={plano}
            ehPlanoAtual={profile?.plano === chave}
            propostasUsadas={profile?.propostas_criadas_no_mes ?? 0}
          />
        ))}
      </div>

      <p className="mt-8 text-xs text-gray-500">
        Os pagamentos são processados pelo Stripe. Enquanto as credenciais não estiverem configuradas em produção
        (ver <code>STRIPE_SECRET_KEY</code> no README), o botão de upgrade informa que o checkout ainda não está disponível —
        nenhuma cobrança falsa é simulada.
      </p>
    </div>
  );
}
