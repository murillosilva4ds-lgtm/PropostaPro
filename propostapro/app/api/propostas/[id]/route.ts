import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { propostaSchema } from "@/lib/proposal-schema";
import { validateProposalReferences } from "@/lib/proposal-references";

const statusSchema = z.object({ status: z.enum(["rascunho", "enviada", "aprovada", "recusada", "expirada"]) });
type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const corpo = await request.json().catch(() => null);
  const resultado = statusSchema.safeParse(corpo);
  if (!resultado.success) return NextResponse.json({ erro: "Status inválido." }, { status: 400 });

  const { data: proposta } = await supabase.from("proposals").select("id").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!proposta) return NextResponse.json({ erro: "Proposta não encontrada." }, { status: 404 });

  const supabaseAdmin = createServiceRoleClient();
  const { error } = await supabaseAdmin.from("proposals").update({ status: resultado.data.status }).eq("id", proposta.id);
  if (error) return NextResponse.json({ erro: "Não foi possível atualizar o status." }, { status: 500 });

  const { error: erroEvento } = await supabaseAdmin
    .from("proposal_events")
    .insert({ proposal_id: proposta.id, tipo: resultado.data.status });
  if (erroEvento) return NextResponse.json({ erro: "Não foi possível registrar a alteração." }, { status: 500 });

  return NextResponse.json({ id: proposta.id, status: resultado.data.status });
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params;
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

  const erroReferencias = await validateProposalReferences(supabase, user.id, dados.clienteId, dados.templateId);
  if (erroReferencias) {
    const status = erroReferencias === "client_not_owned" || erroReferencias === "template_unavailable" ? 400 : 500;
    return NextResponse.json({ erro: "Cliente ou modelo inválido para esta conta." }, { status });
  }

  const { data: proposta } = await supabase.from("proposals").select("id").eq("id", id).eq("user_id", user.id).single();
  if (!proposta) return NextResponse.json({ erro: "Proposta não encontrada." }, { status: 404 });

  const supabaseAdmin = createServiceRoleClient();
  const { error: erroAtualizacao } = await supabaseAdmin
    .from("proposals")
    .update({
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
      taxas: dados.taxas
    })
    .eq("id", id);
  if (erroAtualizacao) return NextResponse.json({ erro: "Não foi possível atualizar a proposta." }, { status: 500 });

  // Substitui os itens (mais simples e seguro do que fazer diff)
  const { error: erroRemoverItens } = await supabaseAdmin.from("proposal_items").delete().eq("proposal_id", id);
  if (erroRemoverItens) return NextResponse.json({ erro: "Não foi possível atualizar os serviços." }, { status: 500 });

  const { error: erroInserirItens } = await supabaseAdmin.from("proposal_items").insert(
    dados.itens.map((item, ordem) => ({
      proposal_id: id,
      nome: item.nome,
      descricao: item.descricao || null,
      quantidade: item.quantidade,
      valor_unitario: item.valorUnitario,
      desconto: item.desconto,
      ordem
    }))
  );
  if (erroInserirItens) return NextResponse.json({ erro: "Não foi possível atualizar os serviços." }, { status: 500 });

  const { error: erroEvento } = await supabaseAdmin
    .from("proposal_events")
    .insert({ proposal_id: id, tipo: "editada" });
  if (erroEvento) return NextResponse.json({ erro: "Não foi possível registrar a atualização." }, { status: 500 });

  return NextResponse.json({ id });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  await supabase.from("proposals").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
