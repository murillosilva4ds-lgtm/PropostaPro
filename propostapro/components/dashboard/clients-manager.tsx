"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Client } from "@/types/database";

const CLIENTE_VAZIO = { nome: "", email: "", telefone: "", empresa: "", observacoes: "" };

export function ClientsManager({ clientesIniciais }: { clientesIniciais: Client[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState(CLIENTE_VAZIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome) return;
    setSalvando(true);

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (editandoId) {
      await supabase.from("clients").update(form).eq("id", editandoId);
    } else {
      await supabase.from("clients").insert({ ...form, user_id: user!.id });
    }

    setSalvando(false);
    setForm(CLIENTE_VAZIO);
    setEditandoId(null);
    router.refresh();
  }

  function editar(cliente: Client) {
    setEditandoId(cliente.id);
    setForm({
      nome: cliente.nome,
      email: cliente.email ?? "",
      telefone: cliente.telefone ?? "",
      empresa: cliente.empresa ?? "",
      observacoes: cliente.observacoes ?? ""
    });
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este cliente? Propostas já criadas não serão afetadas.")) return;
    await supabase.from("clients").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <form onSubmit={salvar} className="card h-fit space-y-4 p-5 lg:col-span-1">
        <h2 className="text-sm font-semibold text-gray-900">{editandoId ? "Editar cliente" : "Novo cliente"}</h2>
        <div>
          <label className="label">Nome *</label>
          <input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
        </div>
        <div>
          <label className="label">Empresa</label>
          <input className="input" value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} />
        </div>
        <div>
          <label className="label">E-mail</label>
          <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label">Telefone</label>
          <input className="input" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
        </div>
        <div>
          <label className="label">Observações</label>
          <textarea className="input min-h-[70px]" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={salvando} className="btn-primary flex-1">
            {salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Adicionar cliente"}
          </button>
          {editandoId && (
            <button type="button" className="btn-secondary" onClick={() => { setEditandoId(null); setForm(CLIENTE_VAZIO); }}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="card overflow-hidden lg:col-span-2">
        {clientesIniciais.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">Nenhum cliente cadastrado ainda.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Contato</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clientesIniciais.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {c.nome}
                    {c.empresa && <span className="block text-xs text-gray-500">{c.empresa}</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.email || "—"}
                    {c.telefone && <span className="block text-xs text-gray-500">{c.telefone}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3 text-xs font-medium">
                      <button onClick={() => editar(c)} className="text-brand-600 hover:text-brand-700">Editar</button>
                      <button onClick={() => excluir(c.id)} className="text-red-600 hover:text-red-700">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
