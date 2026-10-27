"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

export function ProfileForm({ profile, email }: { profile: Profile | null; email: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState({
    nome: profile?.nome ?? "",
    telefone: profile?.telefone ?? "",
    empresa: profile?.empresa ?? "",
    cnpj: profile?.cnpj ?? ""
  });
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setSalvo(false);

    const {
      data: { user }
    } = await supabase.auth.getUser();

    await supabase.from("profiles").update(form).eq("id", user!.id);

    setSalvando(false);
    setSalvo(true);
    router.refresh();
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <div>
        <label className="label">E-mail</label>
        <input className="input bg-gray-50" value={email} disabled />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Nome</label>
          <input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </div>
        <div>
          <label className="label">Telefone</label>
          <input className="input" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
        </div>
        <div>
          <label className="label">Empresa</label>
          <input className="input" value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} />
        </div>
        <div>
          <label className="label">CNPJ (opcional)</label>
          <input className="input" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={salvando} className="btn-primary">{salvando ? "Salvando..." : "Salvar alterações"}</button>
        {salvo && <span className="text-sm text-green-600">Salvo com sucesso.</span>}
      </div>
    </form>
  );
}
