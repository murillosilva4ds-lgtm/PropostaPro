import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Proposal, ProposalItem, ProposalStatus } from "@/types/database";
import { formatarMoeda, formatarData, STATUS_LABEL, STATUS_COLOR } from "@/lib/utils";
import { StatusSelector } from "@/components/propostas/status-selector";

export default async function DetalhePropostaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: proposta } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single<Proposal>();

  if (!proposta) notFound();

  const { data: itens } = await supabase
    .from("proposal_items")
    .select("*")
    .eq("proposal_id", proposta.id)
    .order("ordem")
    .returns<ProposalItem[]>();

  const linkPublico = `${process.env.NEXT_PUBLIC_APP_URL}/p/${proposta.slug_publico}`;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{proposta.nome_projeto}</h1>
          <p className="mt-1 text-sm text-gray-500">Cliente: {proposta.cliente_nome}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/propostas/${proposta.id}/editar`} className="btn-secondary">Editar</Link>
          <a href={`/api/pdf/${proposta.id}`} className="btn-primary">Baixar PDF</a>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLOR[proposta.status]}`}>{STATUS_LABEL[proposta.status]}</span>
        <StatusSelector propostaId={proposta.id} statusAtual={proposta.status} />
        {proposta.visualizada_em && <span className="text-xs text-gray-500">Visualizada pelo cliente em {formatarData(proposta.visualizada_em)}</span>}
      </div>

      <div className="card mt-6 p-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Serviços</h2>
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-100">
          {(itens ?? []).map((item) => (
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
          <div className="flex justify-between text-gray-600"><span>Taxas</span><span>{formatarMoeda(proposta.taxas)}</span></div>
          <div className="mt-2 flex justify-between border-t border-gray-100 pt-2 text-base font-semibold text-gray-900">
            <span>Valor total</span><span>{formatarMoeda(proposta.valor_total)}</span>
          </div>
        </div>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Link público</h2>
        <div className="flex flex-wrap items-center gap-3">
          <code className="flex-1 truncate rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-700">{linkPublico}</code>
          <a href={`https://wa.me/?text=${encodeURIComponent(linkPublico)}`} target="_blank" rel="noreferrer" className="btn-secondary">WhatsApp</a>
        </div>
      </div>
    </div>
  );
}
