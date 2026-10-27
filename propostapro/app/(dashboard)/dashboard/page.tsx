import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatarMoeda, formatarData, STATUS_LABEL, STATUS_COLOR } from "@/lib/utils";
import type { Proposal } from "@/types/database";
import { ProposalsTable } from "@/components/dashboard/proposals-table";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: propostas } = await supabase
    .from("proposals")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<Proposal[]>();

  const lista = propostas ?? [];
  const total = lista.length;
  const enviadas = lista.filter((p) => p.status === "enviada").length;
  const aprovadas = lista.filter((p) => p.status === "aprovada").length;
  const pendentes = lista.filter((p) => p.status === "rascunho" || p.status === "enviada").length;
  const valorTotal = lista.reduce((acc, p) => acc + Number(p.valor_total || 0), 0);

  const cards = [
    { label: "Propostas criadas", valor: total },
    { label: "Propostas enviadas", valor: enviadas },
    { label: "Propostas aprovadas", valor: aprovadas },
    { label: "Propostas pendentes", valor: pendentes },
    { label: "Valor total em propostas", valor: formatarMoeda(valorTotal) }
  ];

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Painel</h1>
          <p className="mt-1 text-sm text-gray-500">Visão geral das suas propostas comerciais.</p>
        </div>
        <Link href="/propostas/novo" className="btn-primary">+ Criar nova proposta</Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="card p-5">
            <p className="text-xs font-medium text-gray-500">{c.label}</p>
            <p className="mt-2 text-xl font-semibold text-gray-900">{c.valor}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Propostas recentes</h2>
        <ProposalsTable propostas={lista} />
      </div>
    </div>
  );
}
