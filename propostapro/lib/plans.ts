import type { PlanTier } from "@/types/database";

/**
 * Limites de cada plano. Esta é a ÚNICA fonte de verdade: toda rota de API
 * que cria propostas ou usa IA deve checar estes limites no backend
 * (ver app/api/propostas/route.ts e app/api/ia/gerar-descricao/route.ts).
 * Esconder botões no frontend NUNCA é suficiente.
 */
export const PLAN_LIMITS: Record<
  PlanTier,
  {
    nome: string;
    precoMensal: number;
    propostasPorMes: number | "ilimitado";
    iaUsosPorMes: number;
    modelosExclusivos: boolean;
    personalizacaoAvancada: boolean;
    compartilhamentoLink: boolean;
  }
> = {
  gratuito: {
    nome: "Gratuito",
    precoMensal: 0,
    propostasPorMes: 3,
    iaUsosPorMes: 0,
    modelosExclusivos: false,
    personalizacaoAvancada: false,
    compartilhamentoLink: true
  },
  pro: {
    nome: "Pro",
    precoMensal: 29.9,
    propostasPorMes: 50,
    iaUsosPorMes: 20,
    modelosExclusivos: true,
    personalizacaoAvancada: true,
    compartilhamentoLink: true
  },
  premium: {
    nome: "Premium",
    precoMensal: 59.9,
    propostasPorMes: 200, // "ilimitado dentro de limites razoáveis de uso"
    iaUsosPorMes: 100,
    modelosExclusivos: true,
    personalizacaoAvancada: true,
    compartilhamentoLink: true
  }
};

export function podeGerarProposta(plano: PlanTier, propostasNoMes: number): boolean {
  const limite = PLAN_LIMITS[plano].propostasPorMes;
  if (limite === "ilimitado") return true;
  return propostasNoMes < limite;
}

export function podeUsarIA(plano: PlanTier, usosNoMes: number): boolean {
  return usosNoMes < PLAN_LIMITS[plano].iaUsosPorMes;
}
