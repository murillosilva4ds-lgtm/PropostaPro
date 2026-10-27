import type { Template } from "@/types/database";
import type { PropostaFormulario } from "./types";

const CORES = ["#f52f78", "#ff684f", "#2563eb", "#059669", "#111827"];

export function StepPersonalizacao({
  form,
  setForm,
  templates
}: {
  form: PropostaFormulario;
  setForm: (f: PropostaFormulario) => void;
  templates: Template[];
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="label">Modelo da proposta</label>
        <div className="grid gap-3 sm:grid-cols-2">
          {templates.map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => setForm({ ...form, templateId: t.id })}
              className={`rounded-xl border p-4 text-left text-sm transition-colors ${
                form.templateId === t.id ? "border-brand-600 bg-brand-50" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <p className="font-medium text-gray-900">{t.titulo}</p>
              <p className="mt-1 text-xs text-gray-500">{t.descricao}</p>
              {t.exclusivo_premium && <span className="mt-2 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">Exclusivo Premium</span>}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Cor da proposta</label>
        <div className="flex gap-2">
          {CORES.map((cor) => (
            <button
              type="button"
              key={cor}
              onClick={() => setForm({ ...form, corTema: cor })}
              className="h-9 w-9 rounded-full ring-offset-2 transition-shadow"
              style={{ backgroundColor: cor, boxShadow: form.corTema === cor ? `0 0 0 2px ${cor}` : "none" }}
              aria-label={cor}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label">Nome de quem assina</label>
          <input className="input" value={form.assinaturaNome} onChange={(e) => setForm({ ...form, assinaturaNome: e.target.value })} />
        </div>
        <div>
          <label className="label">Cargo / função</label>
          <input className="input" value={form.assinaturaCargo} onChange={(e) => setForm({ ...form, assinaturaCargo: e.target.value })} />
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Logotipo e nome da empresa são definidos uma única vez em <strong>Perfil &gt; Identidade visual</strong> e aplicados automaticamente a todas as propostas.
      </p>
    </div>
  );
}
