import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { formatarMoeda, formatarData, STATUS_LABEL, STATUS_COLOR } from "@/lib/utils";
import { ProposalActions } from "@/components/propostas/public-actions";
import { publicLogoUrl } from "@/lib/supabase/public-logo-url";

export const dynamic = "force-dynamic";

async function buscarProposta(slug: string) {
  const supabase = createServiceRoleClient();

  const { data: proposta } = await supabase.from("public_proposal_view").select("*").eq("slug_publico", slug).single();
  if (!proposta) return null;

  const { data: itens } = await supabase
    .from("proposal_items")
    .select("*")
    .eq("proposal_id", proposta.id)
    .order("ordem");

  // Registra a visualização (não marca como aprovada — apenas um evento informativo)
  await supabase.from("proposals").update({ visualizada_em: new Date().toISOString() }).eq("id", proposta.id);
  await supabase.from("proposal_events").insert({ proposal_id: proposta.id, tipo: "visualizada" });

  return { ...proposta, logo_url: publicLogoUrl(proposta.logo_url), itens: itens ?? [] };
}

export default async function PropostaPublicaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const proposta = await buscarProposta(slug);
  if (!proposta) notFound();

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-3xl px-5">
        <div className="card overflow-hidden">
          <div className="px-8 py-10 text-white" style={{ backgroundColor: proposta.cor_tema || "#f52f78" }}>
            {proposta.logo_url && <img src={proposta.logo_url} alt={proposta.nome_empresa ?? ""} className="mb-6 h-10 object-contain" />}
            <p className="text-sm opacity-80">{proposta.nome_empresa || "Proposta Comercial"}</p>
            <h1 className="mt-2 text-2xl font-semibold">{proposta.nome_projeto}</h1>
            <p className="mt-1 text-sm opacity-90">Preparado para {proposta.cliente_nome}</p>
          </div>

          <div className="space-y-8 p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLOR[proposta.status]}`}>
                {STATUS_LABEL[proposta.status]}
              </span>
              <p className="text-xs text-gray-500">Emitida em {formatarData(proposta.data_emissao)} · Válida por {proposta.validade_dias} dias</p>
            </div>

            <div>
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Serviços</h2>
              <div className="divide-y divide-gray-100 rounded-xl border border-gray-100">
                {proposta.itens.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <div>
                      <p className="font-medium text-gray-900">{item.nome}</p>
                      {item.descricao && <p className="text-xs text-gray-500">{item.descricao}</p>}
                    </div>
                    <p className="font-medium text-gray-700">{formatarMoeda(item.quantidade * item.valor_unitario - item.desconto)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatarMoeda(proposta.subtotal)}</span></div>
                <div className="flex justify-between text-gray-600"><span>Descontos</span><span>- {formatarMoeda(proposta.desconto_total)}</span></div>
                <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-semibold text-gray-900">
                  <span>Valor total</span><span>{formatarMoeda(proposta.valor_total)}</span>
                </div>
              </div>
            </div>

            {proposta.escopo && (
              <div>
                <h2 className="mb-2 text-sm font-semibold text-gray-900">Escopo do projeto</h2>
                <p className="text-sm text-gray-600">{proposta.escopo}</p>
              </div>
            )}

            <div className="grid gap-4 border-t border-gray-100 pt-6 sm:grid-cols-2">
              <div>
                <p className="text-xs text-gray-500">Prazo de execução</p>
                <p className="text-sm font-medium text-gray-900">{proposta.prazo_execucao || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Condições de pagamento</p>
                <p className="text-sm font-medium text-gray-900">{proposta.condicoes_pagamento || "—"}</p>
              </div>
            </div>

            <ProposalActions nomeProjeto={proposta.nome_projeto} clienteNome={proposta.cliente_nome} />
          </div>
        </div>
      </div>
    </div>
  );
}
