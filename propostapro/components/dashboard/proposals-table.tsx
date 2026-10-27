"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Proposal, ProposalStatus } from "@/types/database";
import { formatarMoeda, formatarData, STATUS_LABEL, STATUS_COLOR } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export function ProposalsTable({ propostas }: { propostas: Proposal[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<ProposalStatus | "todos">("todos");

  const filtradas = useMemo(() => {
    return propostas.filter((p) => {
      const correspondeBusca =
        p.cliente_nome.toLowerCase().includes(busca.toLowerCase()) ||
        p.nome_projeto.toLowerCase().includes(busca.toLowerCase());
      const correspondeStatus = statusFiltro === "todos" || p.status === statusFiltro;
      return correspondeBusca && correspondeStatus;
    });
  }, [propostas, busca, statusFiltro]);

  async function excluir(id: string) {
    if (!confirm("Excluir esta proposta? Esta ação não pode ser desfeita.")) return;
    await supabase.from("proposals").delete().eq("id", id);
    router.refresh();
  }

  async function duplicar(proposta: Proposal) {
    const res = await fetch(`/api/propostas/${proposta.id}/duplicar`, { method: "POST" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          placeholder="Buscar por cliente ou nome da proposta"
          className="input sm:max-w-xs"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select className="input sm:max-w-[180px]" value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value as any)}>
          <option value="todos">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {filtradas.length === 0 ? (
        <p className="p-8 text-center text-sm text-gray-500">Nenhuma proposta encontrada.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Proposta</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Criada em</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtradas.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.nome_projeto}</td>
                  <td className="px-4 py-3 text-gray-600">{p.cliente_nome}</td>
                  <td className="px-4 py-3 text-gray-600">{formatarMoeda(p.valor_total)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[p.status]}`}>
                      {STATUS_LABEL[p.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatarData(p.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3 text-xs font-medium">
                      <Link href={`/propostas/${p.id}`} className="text-brand-600 hover:text-brand-700">Ver</Link>
                      <Link href={`/propostas/${p.id}/editar`} className="text-gray-600 hover:text-gray-900">Editar</Link>
                      <a href={`/api/pdf/${p.id}`} className="text-gray-600 hover:text-gray-900">PDF</a>
                      <button onClick={() => duplicar(p)} className="text-gray-600 hover:text-gray-900">Duplicar</button>
                      <button onClick={() => excluir(p.id)} className="text-red-600 hover:text-red-700">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
