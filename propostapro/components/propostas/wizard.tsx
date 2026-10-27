"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Client, Template } from "@/types/database";
import { StepIndicator } from "./step-indicator";
import { StepCliente } from "./step-cliente";
import { StepServicos } from "./step-servicos";
import { StepCondicoes } from "./step-condicoes";
import { StepPersonalizacao } from "./step-personalizacao";
import { FORMULARIO_INICIAL, type PropostaFormulario } from "./types";
import { calcularTotaisItens, formatarMoeda } from "@/lib/utils";

export function PropostaWizard({
  clientes,
  templates,
  propostaId,
  valoresIniciais
}: {
  clientes: Client[];
  templates: Template[];
  propostaId?: string;
  valoresIniciais?: PropostaFormulario;
}) {
  const router = useRouter();
  const [etapa, setEtapa] = useState(1);
  const [form, setForm] = useState<PropostaFormulario>(valoresIniciais ?? FORMULARIO_INICIAL);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const totais = calcularTotaisItens(
    form.itens.map((i) => ({ quantidade: i.quantidade, valor_unitario: i.valorUnitario, desconto: i.desconto })),
    form.taxas
  );

  function validarEtapa(): string | null {
    if (etapa === 1 && (!form.clienteNome || !form.nomeProjeto)) return "Preencha o nome do cliente e do projeto.";
    if (etapa === 2 && form.itens.length === 0) return "Adicione pelo menos um serviço.";
    return null;
  }

  function avancar() {
    const mensagem = validarEtapa();
    if (mensagem) {
      setErro(mensagem);
      return;
    }
    setErro(null);
    setEtapa((e) => Math.min(e + 1, 5));
  }

  function voltar() {
    setErro(null);
    setEtapa((e) => Math.max(e - 1, 1));
  }

  async function gerarProposta() {
    setEnviando(true);
    setErro(null);

    const url = propostaId ? `/api/propostas/${propostaId}` : "/api/propostas";
    const metodo = propostaId ? "PUT" : "POST";

    const res = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    setEnviando(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.erro || "Não foi possível salvar a proposta. Tente novamente.");
      return;
    }

    const data = await res.json();
    router.push(`/propostas/${propostaId ?? data.id}`);
  }

  return (
    <div>
      <StepIndicator etapaAtual={etapa} />

      <div className="card p-6">
        {etapa === 1 && <StepCliente form={form} setForm={setForm} clientes={clientes} />}
        {etapa === 2 && <StepServicos form={form} setForm={setForm} />}
        {etapa === 3 && <StepCondicoes form={form} setForm={setForm} />}
        {etapa === 4 && <StepPersonalizacao form={form} setForm={setForm} templates={templates} />}
        {etapa === 5 && (
          <div className="space-y-5">
            <h3 className="text-base font-semibold text-gray-900">Revisão final</h3>
            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <Resumo label="Cliente" valor={form.clienteNome} />
              <Resumo label="Projeto" valor={form.nomeProjeto} />
              <Resumo label="Serviços" valor={`${form.itens.length} item(ns)`} />
              <Resumo label="Valor total" valor={formatarMoeda(totais.valorTotal)} />
              <Resumo label="Prazo de execução" valor={form.prazoExecucao || "—"} />
              <Resumo label="Condições de pagamento" valor={form.condicoesPagamento || "—"} />
            </div>
            <p className="text-xs text-gray-500">
              Ao gerar, a proposta é salva como rascunho e um link público é criado automaticamente. Você poderá baixar o PDF e compartilhar em seguida.
            </p>
          </div>
        )}

        {erro && <p className="mt-4 text-sm text-red-600">{erro}</p>}

        <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-5">
          <button type="button" onClick={voltar} disabled={etapa === 1} className="btn-secondary disabled:opacity-0">
            Voltar
          </button>
          {etapa < 5 ? (
            <button type="button" onClick={avancar} className="btn-primary">Continuar</button>
          ) : (
            <button type="button" onClick={gerarProposta} disabled={enviando} className="btn-primary">
              {enviando ? "Salvando..." : propostaId ? "Salvar alterações" : "Gerar proposta"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Resumo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-gray-900">{valor}</p>
    </div>
  );
}
