import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Template } from "@/types/database";

export default async function ModelosPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [{ data: templates }, { data: profile }] = await Promise.all([
    supabase.from("templates").select("*").order("titulo").returns<Template[]>(),
    supabase.from("profiles").select("plano").eq("id", user!.id).single()
  ]);

  const plano = profile?.plano ?? "gratuito";

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Biblioteca de modelos</h1>
      <p className="mt-1 text-sm text-gray-500">Escolha um modelo como ponto de partida ao criar uma nova proposta.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(templates ?? []).map((t) => {
          const bloqueado = t.exclusivo_premium && plano !== "premium";
          return (
            <div key={t.id} className="card p-5">
              <div className="flex items-start justify-between">
                <h3 className="font-medium text-gray-900">{t.titulo}</h3>
                {t.exclusivo_premium && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">Premium</span>
                )}
              </div>
              <p className="mt-2 text-sm text-gray-600">{t.descricao}</p>
              {t.campos_sugeridos?.servicos_exemplo && (
                <ul className="mt-3 space-y-1 text-xs text-gray-500">
                  {t.campos_sugeridos.servicos_exemplo.slice(0, 3).map((s) => (
                    <li key={s}>• {s}</li>
                  ))}
                </ul>
              )}
              {bloqueado ? (
                <Link href="/assinatura" className="btn-secondary mt-4 w-full">Disponível no plano Premium</Link>
              ) : (
                <Link href="/propostas/novo" className="btn-primary mt-4 w-full">Usar este modelo</Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
