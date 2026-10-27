import type { Client } from "@/types/database";
import type { PropostaFormulario } from "./types";

export function StepCliente({
  form,
  setForm,
  clientes
}: {
  form: PropostaFormulario;
  setForm: (f: PropostaFormulario) => void;
  clientes: Client[];
}) {
  function selecionarCliente(id: string) {
    const cliente = clientes.find((c) => c.id === id);
    if (!cliente) {
      setForm({ ...form, clienteId: null });
      return;
    }
    setForm({
      ...form,
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      clienteEmail: cliente.email ?? "",
      clienteTelefone: cliente.telefone ?? ""
    });
  }

  return (
    <div className="space-y-5">
      {clientes.length > 0 && (
        <div>
          <label className="label">Cliente salvo (opcional)</label>
          <select className="input" value={form.clienteId ?? ""} onChange={(e) => selecionarCliente(e.target.value)}>
            <option value="">Novo cliente — preencher manualmente</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label">Nome do cliente ou empresa *</label>
          <input className="input" value={form.clienteNome} onChange={(e) => setForm({ ...form, clienteNome: e.target.value })} required />
        </div>
        <div>
          <label className="label">Nome do projeto *</label>
          <input className="input" value={form.nomeProjeto} onChange={(e) => setForm({ ...form, nomeProjeto: e.target.value })} required />
        </div>
        <div>
          <label className="label">E-mail do cliente</label>
          <input type="email" className="input" value={form.clienteEmail} onChange={(e) => setForm({ ...form, clienteEmail: e.target.value })} />
        </div>
        <div>
          <label className="label">Telefone do cliente</label>
          <input className="input" value={form.clienteTelefone} onChange={(e) => setForm({ ...form, clienteTelefone: e.target.value })} />
        </div>
        <div>
          <label className="label">Data de emissão</label>
          <input type="date" className="input" value={form.dataEmissao} onChange={(e) => setForm({ ...form, dataEmissao: e.target.value })} />
        </div>
        <div>
          <label className="label">Validade da proposta (dias)</label>
          <input
            type="number"
            min={1}
            className="input"
            value={form.validadeDias}
            onChange={(e) => setForm({ ...form, validadeDias: Number(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );
}
