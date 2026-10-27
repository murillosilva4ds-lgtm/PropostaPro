"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ProposalStatus } from "@/types/database";
import { STATUS_LABEL } from "@/lib/utils";

export function StatusSelector({ propostaId, statusAtual }: { propostaId: string; statusAtual: ProposalStatus }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function alterarStatus(novoStatus: ProposalStatus) {
    setCarregando(true);
    setErro(null);
    const response = await fetch(`/api/propostas/${propostaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novoStatus })
    });
    setCarregando(false);
    if (!response.ok) {
      setErro("Não foi possível atualizar o status.");
      return;
    }
    router.refresh();
  }

  return (
    <>
      <select
        className="input w-auto text-xs"
        value={statusAtual}
        disabled={carregando}
        onChange={(e) => alterarStatus(e.target.value as ProposalStatus)}
      >
        {Object.entries(STATUS_LABEL).map(([key, label]) => (
          <option key={key} value={key}>Marcar como: {label}</option>
        ))}
      </select>
      {erro && <span className="ml-2 text-xs text-red-600">{erro}</span>}
    </>
  );
}
