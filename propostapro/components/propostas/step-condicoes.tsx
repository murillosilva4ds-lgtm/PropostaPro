import type { PropostaFormulario } from "./types";
import { AiAssistButton } from "./ai-assist-button";

export function StepCondicoes({
  form,
  setForm
}: {
  form: PropostaFormulario;
  setForm: (f: PropostaFormulario) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label">Prazo estimado de execução</label>
          <input className="input" placeholder="Ex: 20 dias úteis" value={form.prazoExecucao} onChange={(e) => setForm({ ...form, prazoExecucao: e.target.value })} />
        </div>
        <div>
          <label className="label">Data prevista de entrega</label>
          <input type="date" className="input" value={form.dataEntregaPrevista} onChange={(e) => setForm({ ...form, dataEntregaPrevista: e.target.value })} />
        </div>
        <div>
          <label className="label">Condições de pagamento</label>
          <input className="input" placeholder="Ex: 50% entrada + 50% na entrega" value={form.condicoesPagamento} onChange={(e) => setForm({ ...form, condicoesPagamento: e.target.value })} />
        </div>
        <div>
          <label className="label">Número de parcelas</label>
          <input type="number" min={1} className="input" value={form.numeroParcelas} onChange={(e) => setForm({ ...form, numeroParcelas: Number(e.target.value) })} />
        </div>
        <div>
          <label className="label">Entrada (R$, opcional)</label>
          <input type="number" min={0} step="0.01" className="input" value={form.entradaValor} onChange={(e) => setForm({ ...form, entradaValor: Number(e.target.value) })} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="label">Escopo do projeto</label>
          <AiAssistButton tipo="escopo" contexto={form.nomeProjeto} onResultado={(texto) => setForm({ ...form, escopo: texto })} />
        </div>
        <textarea className="input min-h-[90px]" value={form.escopo} onChange={(e) => setForm({ ...form, escopo: e.target.value })} placeholder="Descreva o que está incluído no projeto" />
      </div>
      <div>
        <label className="label">Itens não inclusos</label>
        <textarea className="input min-h-[70px]" value={form.itensNaoInclusos} onChange={(e) => setForm({ ...form, itensNaoInclusos: e.target.value })} placeholder="Deixe claro o que não faz parte do escopo" />
      </div>
      <div>
        <label className="label">Garantias e observações</label>
        <textarea className="input min-h-[70px]" value={form.garantias} onChange={(e) => setForm({ ...form, garantias: e.target.value })} />
      </div>
    </div>
  );
}
