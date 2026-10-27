import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { propostaSchema } from "@/lib/proposal-schema";
import { validateProposalReferences } from "@/lib/proposal-references";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const corpo = await request.json().catch(() => null);
  const resultado = propostaSchema.safeParse(corpo);

  if (!resultado.success) {
    return NextResponse.json({ erro: resultado.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const dados = resultado.data;

  const { error: erroPerfil } = await supabase.rpc("ensure_current_profile");
  if (erroPerfil) {
    return NextResponse.json(
      { erro: "Não foi possível preparar seu perfil. Verifique as funções de perfil no Supabase." },
      { status: 500 }
    );
  }

  const erroReferencias = await validateProposalReferences(supabase, user.id, dados.clienteId, dados.templateId);
  if (erroReferencias) {
    const status = erroReferencias === "client_not_owned" || erroReferencias === "template_unavailable" ? 400 : 500;
    return NextResponse.json({ erro: "Cliente ou modelo inválido para esta conta." }, { status });
  }

  const { data: reserva, error: erroLimite } = await supabase.rpc("reserve_proposal_slot");
  if (erroLimite || !reserva) {
    if (erroLimite?.message.includes("proposal_quota_exceeded")) {
      return NextResponse.json(
        { erro: "Você atingiu o limite de propostas do seu plano este mês. Faça upgrade para continuar criando." },
        { status: 403 }
      );
    }
    return NextResponse.json({ erro: "Não foi possível validar o limite do seu plano." }, { status: 500 });
  }

  // --- Cria a proposta ---
  const supabaseAdmin = createServiceRoleClient();
  const { data: proposta, error: erroProposta } = await supabaseAdmin
    .from("proposals")
    .insert({
      user_id: user.id,
      client_id: dados.clienteId || null,
      template_id: dados.templateId || null,
      nome_projeto: dados.nomeProjeto,
      cliente_nome: dados.clienteNome,
      cliente_email: dados.clienteEmail || null,
      cliente_telefone: dados.clienteTelefone || null,
      data_emissao: dados.dataEmissao,
      validade_dias: dados.validadeDias,
      prazo_execucao: dados.prazoExecucao || null,
      data_entrega_prevista: dados.dataEntregaPrevista || null,
      condicoes_pagamento: dados.condicoesPagamento || null,
      numero_parcelas: dados.numeroParcelas,
      entrada_valor: dados.entradaValor,
      garantias: dados.garantias || null,
      observacoes: dados.observacoes || null,
      escopo: dados.escopo || null,
      itens_nao_inclusos: dados.itensNaoInclusos || null,
      cor_tema: dados.corTema,
      assinatura_nome: dados.assinaturaNome || null,
      assinatura_cargo: dados.assinaturaCargo || null,
      taxas: dados.taxas,
      status: "rascunho"
    })
    .select("id")
    .single();

  if (erroProposta || !proposta) {
    await supabase.rpc("complete_proposal_slot", { p_reservation_id: reserva, p_succeeded: false });
    return NextResponse.json({ erro: "Não foi possível criar a proposta." }, { status: 500 });
  }

  // --- Cria os itens (um trigger no banco recalcula os totais automaticamente) ---
  const { error: erroItens } = await supabaseAdmin.from("proposal_items").insert(
    dados.itens.map((item, ordem) => ({
      proposal_id: proposta.id,
      nome: item.nome,
      descricao: item.descricao || null,
      quantidade: item.quantidade,
      valor_unitario: item.valorUnitario,
      desconto: item.desconto,
      ordem
    }))
  );

  if (erroItens) {
    await supabaseAdmin.from("proposals").delete().eq("id", proposta.id);
    await supabase.rpc("complete_proposal_slot", { p_reservation_id: reserva, p_succeeded: false });
    return NextResponse.json({ erro: "Não foi possível salvar os serviços da proposta." }, { status: 500 });
  }

  const { error: erroEvento } = await supabaseAdmin
    .from("proposal_events")
    .insert({ proposal_id: proposta.id, tipo: "criada" });
  if (erroEvento) {
    await supabaseAdmin.from("proposals").delete().eq("id", proposta.id);
    await supabase.rpc("complete_proposal_slot", { p_reservation_id: reserva, p_succeeded: false });
    return NextResponse.json({ erro: "Não foi possível registrar a criação da proposta." }, { status: 500 });
  }

  const { error: erroFinalizacao } = await supabase.rpc("complete_proposal_slot", {
    p_reservation_id: reserva,
    p_succeeded: true
  });
  if (erroFinalizacao) {
    await supabaseAdmin.from("proposals").delete().eq("id", proposta.id);
    await supabase.rpc("complete_proposal_slot", { p_reservation_id: reserva, p_succeeded: false });
    return NextResponse.json({ erro: "Não foi possível finalizar o controle de uso da proposta." }, { status: 500 });
  }

  return NextResponse.json({ id: proposta.id }, { status: 201 });
}
