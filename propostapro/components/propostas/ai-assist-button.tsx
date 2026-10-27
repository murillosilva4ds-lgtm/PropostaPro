"use client";

import { useState } from "react";

export function AiAssistButton({
  tipo,
  contexto,
  onResultado
}: {
  tipo: "descricao" | "escopo" | "cronograma";
  contexto: string;
  onResultado: (texto: string) => void;
}) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function gerar() {
    if (!contexto) {
      setErro("Preencha o nome do item antes de usar a IA.");
      return;
    }
    setCarregando(true);
    setErro(null);

    const res = await fetch("/api/ia/gerar-descricao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, contexto })
    });

    const data = await res.json();
    setCarregando(false);

    if (!res.ok) {
      setErro(data.erro || "Não foi possível gerar com IA.");
      return;
    }

    onResultado(data.texto);
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={gerar} disabled={carregando} className="text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50">
        {carregando ? "Gerando..." : "Melhorar com IA"}
      </button>
      {erro && <span className="text-xs text-red-600">{erro}</span>}
    </span>
  );
}
