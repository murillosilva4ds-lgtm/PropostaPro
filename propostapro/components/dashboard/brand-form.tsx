"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Marca {
  nome_empresa: string | null;
  logo_url: string | null;
  cor_primaria: string | null;
  site: string | null;
  instagram: string | null;
}

export function BrandForm({ marca }: { marca: Marca | null }) {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState({
    nome_empresa: marca?.nome_empresa ?? "",
    site: marca?.site ?? "",
    instagram: marca?.instagram ?? "",
    cor_primaria: marca?.cor_primaria ?? "#f52f78"
  });
  const [logoUrl, setLogoUrl] = useState(marca?.logo_url ?? "");
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  async function enviarLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    setEnviandoLogo(true);
    const {
      data: { user }
    } = await supabase.auth.getUser();

    const caminho = `${user!.id}/logo-${Date.now()}.${arquivo.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("logos").upload(caminho, arquivo, { upsert: true });

    if (!error) {
      const { data } = supabase.storage.from("logos").getPublicUrl(caminho);
      setLogoUrl(data.publicUrl);
    }
    setEnviandoLogo(false);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setSalvo(false);

    const {
      data: { user }
    } = await supabase.auth.getUser();

    await supabase.from("brand_settings").upsert({ user_id: user!.id, ...form, logo_url: logoUrl }, { onConflict: "user_id" });

    setSalvando(false);
    setSalvo(true);
    router.refresh();
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <div>
        <label className="label">Logotipo</label>
        <div className="flex items-center gap-4">
          {logoUrl && <img src={logoUrl} alt="Logotipo" className="h-12 w-auto rounded-lg border border-gray-100 object-contain p-1" />}
          <input type="file" accept="image/*" onChange={enviarLogo} className="text-sm" />
        </div>
        {enviandoLogo && <p className="mt-1 text-xs text-gray-500">Enviando logotipo...</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Nome da empresa</label>
          <input className="input" value={form.nome_empresa} onChange={(e) => setForm({ ...form, nome_empresa: e.target.value })} />
        </div>
        <div>
          <label className="label">Cor principal</label>
          <input type="color" className="h-10 w-full rounded-xl border border-gray-200" value={form.cor_primaria} onChange={(e) => setForm({ ...form, cor_primaria: e.target.value })} />
        </div>
        <div>
          <label className="label">Site</label>
          <input className="input" value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} />
        </div>
        <div>
          <label className="label">Instagram</label>
          <input className="input" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={salvando} className="btn-primary">{salvando ? "Salvando..." : "Salvar identidade visual"}</button>
        {salvo && <span className="text-sm text-green-600">Salvo com sucesso.</span>}
      </div>
    </form>
  );
}
