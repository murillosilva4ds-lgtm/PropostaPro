"use client";

import { nanoid } from "nanoid";
import type { PropostaFormulario } from "./types";
import { calcularTotaisItens, formatarMoeda } from "@/lib/utils";
import { AiAssistButton } from "./ai-assist-button";

export function StepServicos({
  form,
  setForm
}: {
  form: PropostaFormulario;
  setForm: (f: PropostaFormulario) => void;
}) {
  function adicionarItem() {
    setForm({
      ...form,
      itens: [
        ...form.itens,
        { idTemp: nanoid(8), nome: "", descricao: "", quantidade: 1, valorUnitario: 0, desconto: 0 }
      ]
    });
  }

  function atualizarItem(idTemp: string, campo: string, valor: string | number) {
    setForm({
      ...form,
      itens: form.itens.map((item) => (item.idTemp === idTemp ? { ...item, [campo]: valor } : item))
    });
  }

  function removerItem(idTemp: string) {
    setForm({ ...form, itens: form.itens.filter((i) => i.idTemp !== idTemp) });
  }

  const totais = calcularTotaisItens(
    form.itens.map((i) => ({ quantidade: i.quantidade, valor_unitario: i.valorUnitario, desconto: i.desconto })),
    form.taxas
  );

  return (
    <div className="space-y-5">
      {form.itens.length === 0 && (
        <p className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
          Nenhum serviço adicionado ainda.
        </p>
      )}

      <div className="space-y-4">
        {form.itens.map((item) => (
          <div key={item.idTemp} className="card space-y-3 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Nome do serviço</label>
                <input
                  className="input"
                  value={item.nome}
                  onChange={(e) => atualizarItem(item.idTemp, "nome", e.target.value)}
                  placeholder="Ex: Criação de identidade visual"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="label">Descrição detalhada</label>
                  <AiAssistButton tipo="descricao" contexto={item.nome} onResultado={(texto) => atualizarItem(item.idTemp, "descricao", texto)} />
                </div>
                <input
                  className="input"
                  value={item.descricao}
                  onChange={(e) => atualizarItem(item.idTemp, "descricao", e.target.value)}
                  placeholder="O que está incluído neste serviço"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="label">Quantidade</label>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  className="input"
                  value={item.quantidade}
                  onChange={(e) => atualizarItem(item.idTemp, "quantidade", Number(e.target.value))}
                />
              </div>
              <div>
                <label className="label">Valor unitário (R$)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="input"
                  value={item.valorUnitario}
                  onChange={(e) => atualizarItem(item.idTemp, "valorUnitario", Number(e.target.value))}
                />
              </div>
              <div>
                <label className="label">Desconto (R$)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="input"
                  value={item.desconto}
                  onChange={(e) => atualizarItem(item.idTemp, "desconto", Number(e.target.value))}
                />
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-gray-500">Subtotal</p>
                  <p className="font-medium text-gray-900">{formatarMoeda(item.quantidade * item.valorUnitario - item.desconto)}</p>
                </div>
                <button type="button" onClick={() => removerItem(item.idTemp)} className="text-xs font-medium text-red-600 hover:text-red-700">
                  Remover
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={adicionarItem} className="btn-secondary">+ Adicionar serviço</button>

      <div className="grid gap-5 border-t border-gray-100 pt-5 sm:grid-cols-2">
        <div>
          <label className="label">Taxas ou condições especiais (R$)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            className="input"
            value={form.taxas}
            onChange={(e) => setForm({ ...form, taxas: Number(e.target.value) })}
          />
        </div>
        <div className="card flex flex-col justify-center p-4">
          <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>{formatarMoeda(totais.subtotal)}</span></div>
          <div className="flex justify-between text-sm text-gray-600"><span>Descontos</span><span>- {formatarMoeda(totais.descontoTotal)}</span></div>
          <div className="flex justify-between text-sm text-gray-600"><span>Taxas</span><span>{formatarMoeda(form.taxas)}</span></div>
          <div className="mt-2 flex justify-between border-t border-gray-100 pt-2 text-base font-semibold text-gray-900">
            <span>Valor total</span><span>{formatarMoeda(totais.valorTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
