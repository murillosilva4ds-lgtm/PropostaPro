import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PropostaWizard } from "@/components/propostas/wizard";
import type { Client, Proposal, ProposalItem, Template } from "@/types/database";
import type { PropostaFormulario } from "@/components/propostas/types";

export default async function EditarPropostaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: proposta } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single<Proposal>();

  if (!proposta) notFound();

  const [{ data: itens }, { data: clientes }, { data: templates }] = await Promise.all([
    supabase.from("proposal_items").select("*").eq("proposal_id", proposta.id).order("ordem").returns<ProposalItem[]>(),
    supabase.from("clients").select("*").eq("user_id", user!.id).order("nome").returns<Client[]>(),
    supabase.from("templates").select("*").order("titulo").returns<Template[]>()
  ]);

  const valoresIniciais: PropostaFormulario = {
    clienteId: proposta.client_id,
    clienteNome: proposta.cliente_nome,
    clienteEmail: proposta.cliente_email ?? "",
    clienteTelefone: proposta.cliente_telefone ?? "",
    nomeProjeto: proposta.nome_projeto,
    dataEmissao: proposta.data_emissao,
    validadeDias: proposta.validade_dias,
    itens: (itens ?? []).map((i) => ({
      idTemp: i.id,
      nome: i.nome,
      descricao: i.descricao ?? "",
      quantidade: Number(i.quantidade),
      valorUnitario: Number(i.valor_unitario),
      desconto: Number(i.desconto)
    })),
    taxas: Number(proposta.taxas),
    prazoExecucao: proposta.prazo_execucao ?? "",
    dataEntregaPrevista: proposta.data_entrega_prevista ?? "",
    condicoesPagamento: proposta.condicoes_pagamento ?? "",
    numeroParcelas: proposta.numero_parcelas,
    entradaValor: Number(proposta.entrada_valor),
    garantias: proposta.garantias ?? "",
    observacoes: proposta.observacoes ?? "",
    escopo: proposta.escopo ?? "",
    itensNaoInclusos: proposta.itens_nao_inclusos ?? "",
    templateId: proposta.template_id,
    corTema: proposta.cor_tema,
    assinaturaNome: proposta.assinatura_nome ?? "",
    assinaturaCargo: proposta.assinatura_cargo ?? ""
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-gray-900">Editar proposta</h1>
      <p className="mt-1 text-sm text-gray-500">Atualize as informações e salve as alterações.</p>
      <div className="mt-6">
        <PropostaWizard clientes={clientes ?? []} templates={templates ?? []} propostaId={proposta.id} valoresIniciais={valoresIniciais} />
      </div>
    </div>
  );
}
