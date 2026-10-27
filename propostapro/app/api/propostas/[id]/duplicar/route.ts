import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { validateProposalReferences } from "@/lib/proposal-references";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: propostaId } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { data: original } = await supabase.from("proposals").select("*").eq("id", propostaId).eq("user_id", user.id).single();
  if (!original) return NextResponse.json({ erro: "Proposta não encontrada." }, { status: 404 });

  const { error: erroPerfil } = await supabase.rpc("ensure_current_profile");
  if (erroPerfil) return NextResponse.json({ erro: "Não foi possível preparar seu perfil." }, { status: 500 });

  const erroReferencias = await validateProposalReferences(supabase, user.id, original.client_id, original.template_id);
  if (erroReferencias) {
    const status = erroReferencias === "client_not_owned" || erroReferencias === "template_unavailable" ? 403 : 500;
    return NextResponse.json({ erro: "Não é possível duplicar esta proposta para o plano atual." }, { status });
  }

  const { data: reserva, error: erroLimite } = await supabase.rpc("reserve_proposal_slot");
  if (erroLimite || !reserva) {
    if (erroLimite?.message.includes("proposal_quota_exceeded")) {
      return NextResponse.json({ erro: "Você atingiu o limite de propostas do seu plano este mês." }, { status: 403 });
    }
    return NextResponse.json({ erro: "Não foi possível validar o limite do seu plano." }, { status: 500 });
  }

  const { data: itensOriginais } = await supabase.from("proposal_items").select("*").eq("proposal_id", original.id);

  const { id, slug_publico, created_at, updated_at, status, visualizada_em, subtotal, desconto_total, valor_total, ...resto } = original;

  const supabaseAdmin = createServiceRoleClient();
  const { data: copia, error } = await supabaseAdmin
    .from("proposals")
    .insert({ ...resto, nome_projeto: `${original.nome_projeto} (cópia)`, status: "rascunho" })
    .select("id")
    .single();

  if (error || !copia) {
    await supabase.rpc("complete_proposal_slot", { p_reservation_id: reserva, p_succeeded: false });
    return NextResponse.json({ erro: "Não foi possível duplicar a proposta." }, { status: 500 });
  }

  if (itensOriginais && itensOriginais.length > 0) {
    const { error: erroItens } = await supabaseAdmin.from("proposal_items").insert(
      itensOriginais.map((item) => ({
        proposal_id: copia.id,
        nome: item.nome,
        descricao: item.descricao,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        desconto: item.desconto,
        ordem: item.ordem
      }))
    );
    if (erroItens) {
      await supabaseAdmin.from("proposals").delete().eq("id", copia.id);
      await supabase.rpc("complete_proposal_slot", { p_reservation_id: reserva, p_succeeded: false });
      return NextResponse.json({ erro: "Não foi possível duplicar os serviços da proposta." }, { status: 500 });
    }
  }

  const { error: erroFinalizacao } = await supabase.rpc("complete_proposal_slot", {
    p_reservation_id: reserva,
    p_succeeded: true
  });
  if (erroFinalizacao) {
    await supabaseAdmin.from("proposals").delete().eq("id", copia.id);
    await supabase.rpc("complete_proposal_slot", { p_reservation_id: reserva, p_succeeded: false });
    return NextResponse.json({ erro: "Não foi possível finalizar o controle de uso." }, { status: 500 });
  }

  return NextResponse.json({ id: copia.id }, { status: 201 });
}
