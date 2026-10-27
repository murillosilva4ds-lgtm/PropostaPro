"use client";

import { useState } from "react";
import { formatarMoeda } from "@/lib/utils";
import type { PlanTier } from "@/types/database";
import type { PLAN_LIMITS } from "@/lib/plans";

export function PlanCard({
  chave,
  plano,
  ehPlanoAtual,
  propostasUsadas
}: {
  chave: PlanTier;
  plano: (typeof PLAN_LIMITS)["gratuito"];
  ehPlanoAtual: boolean;
  propostasUsadas: number;
}) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function assinar() {
    setCarregando(true);
    setErro(null);

    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plano: chave })
    });

    const data = await res.json();
    setCarregando(false);

    if (!res.ok) {
      setErro(data.erro || "Não foi possível iniciar o checkout.");
      return;
    }

    window.location.href = data.url;
  }

  return (
    <div className={`pricing-card card p-6 ${ehPlanoAtual ? "ring-2 ring-brand-600" : chave === "premium" ? "pricing-card-featured" : ""}`}>
      {chave === "premium" && <p className="pricing-eyebrow mb-3">Mais completo</p>}
      <h3 className="text-lg font-semibold text-gray-900">{plano.nome}</h3>
      <p className="mt-2 text-2xl font-semibold text-gray-900">
        {plano.precoMensal === 0 ? "Grátis" : formatarMoeda(plano.precoMensal)}
        {plano.precoMensal > 0 && <span className="text-sm font-normal text-gray-500">/mês</span>}
      </p>

      <ul className="mt-5 space-y-1.5 text-sm text-gray-600">
        <li>{plano.propostasPorMes === "ilimitado" ? "Propostas ilimitadas (uso razoável)" : `Até ${plano.propostasPorMes} propostas/mês`}</li>
        <li>{plano.iaUsosPorMes > 0 ? `${plano.iaUsosPorMes} usos de IA/mês` : "Sem recursos de IA"}</li>
        <li>{plano.modelosExclusivos ? "Todos os modelos" : "Modelos básicos"}</li>
      </ul>

      {ehPlanoAtual ? (
        <div className="mt-6">
          <span className="block rounded-xl bg-brand-50 px-4 py-2.5 text-center text-sm font-medium text-brand-700">Plano atual</span>
          {plano.propostasPorMes !== "ilimitado" && (
            <p className="mt-2 text-center text-xs text-gray-500">{propostasUsadas} de {plano.propostasPorMes} propostas usadas este mês</p>
          )}
        </div>
      ) : chave === "gratuito" ? (
        <span className="mt-6 block rounded-xl border border-gray-200 px-4 py-2.5 text-center text-sm text-gray-500">Plano de entrada</span>
      ) : (
        <button onClick={assinar} disabled={carregando} className="btn-primary mt-6 w-full">
          {carregando ? "Abrindo checkout..." : "Assinar este plano"}
        </button>
      )}

      {erro && <p className="mt-3 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
