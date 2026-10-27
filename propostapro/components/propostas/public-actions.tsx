"use client";

export function ProposalActions({ nomeProjeto, clienteNome }: { nomeProjeto: string; clienteNome: string }) {
  const url = typeof window !== "undefined" ? window.location.href : "";
  const mensagem = encodeURIComponent(
    `Olá ${clienteNome}! Segue a proposta comercial "${nomeProjeto}" para sua análise: ${url}`
  );

  return (
    <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-6">
      <a href={`https://wa.me/?text=${mensagem}`} target="_blank" rel="noreferrer" className="btn-primary">
        Enviar pelo WhatsApp
      </a>
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(url)}
        className="btn-secondary"
      >
        Copiar link
      </button>
    </div>
  );
}
