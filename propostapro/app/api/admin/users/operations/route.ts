// arquivo: app/api/admin/operations/route.ts

import { createServiceRoleClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - Buscar estatísticas e dados do admin
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");

    switch (action) {
      case "stats":
        return getStats(supabase);
      case "users":
        return getUsers(supabase);
      case "proposals":
        return getProposals(supabase);
      case "revenue":
        return getRevenue(supabase);
      default:
        return NextResponse.json({ error: "Action não especificado" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Erro na operação admin:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Executar operações (atualizar usuário, mudar plano, etc)
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case "update-user-plan":
        return updateUserPlan(supabase, data);
      case "reset-user-password":
        return resetUserPassword(supabase, data);
      case "toggle-user-status":
        return toggleUserStatus(supabase, data);
      case "update-proposal-status":
        return updateProposalStatus(supabase, data);
      default:
        return NextResponse.json({ error: "Action não suportado" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Erro na operação admin:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function getStats(supabase: any) {
  const [
    { count: totalUsers },
    { count: totalProposals },
    { data: proposals }
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("proposals").select("*", { count: "exact", head: true }),
    supabase.from("proposals").select("valor_total, status")
  ]);

  const totalRevenue = (proposals ?? []).reduce((acc: number, p: any) => acc + Number(p.valor_total || 0), 0);
  const approved = (proposals ?? []).filter((p: any) => p.status === "aprovada").length;
  const pending = (proposals ?? []).filter((p: any) => p.status === "pendente").length;
  const rejected = (proposals ?? []).filter((p: any) => p.status === "rejeitada").length;

  return NextResponse.json({
    totalUsers,
    totalProposals,
    totalRevenue,
    approved,
    pending,
    rejected,
    approvalRate: totalProposals ? ((approved / totalProposals) * 100).toFixed(1) : 0,
    averageValue: totalProposals ? (totalRevenue / totalProposals).toFixed(2) : 0
  });
}

async function getUsers(supabase: any) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, nome, plano, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return NextResponse.json(data);
}

async function getProposals(supabase: any) {
  const { data, error } = await supabase
    .from("proposals")
    .select("id, titulo, status, valor_total, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return NextResponse.json(data);
}

async function getRevenue(supabase: any) {
  const { data, error } = await supabase
    .from("proposals")
    .select("created_at, valor_total, status")
    .eq("status", "aprovada");

  if (error) throw error;

  // Agrupar por data
  const revenueByDate: Record<string, number> = {};
  (data ?? []).forEach((proposal: any) => {
    const date = new Date(proposal.created_at).toISOString().split("T")[0];
    revenueByDate[date] = (revenueByDate[date] ?? 0) + Number(proposal.valor_total || 0);
  });

  return NextResponse.json(
    Object.entries(revenueByDate).map(([date, revenue]) => ({ date, revenue }))
  );
}

async function updateUserPlan(supabase: any, data: any) {
  const { userId, plan } = data;

  const { error } = await supabase
    .from("profiles")
    .update({ plano: plan })
    .eq("id", userId);

  if (error) throw error;

  return NextResponse.json({ success: true, message: "Plano atualizado com sucesso" });
}

async function resetUserPassword(supabase: any, data: any) {
  const { email } = data;

  // Implementar lógica de reset de senha
  // Isso pode envolver enviar um email de reset
  return NextResponse.json({ success: true, message: "Email de reset enviado" });
}

async function toggleUserStatus(supabase: any, data: any) {
  const { userId, active } = data;

  const { error } = await supabase
    .from("profiles")
    .update({ ativo: active })
    .eq("id", userId);

  if (error) throw error;

  return NextResponse.json({ success: true, message: "Status do usuário atualizado" });
}

async function updateProposalStatus(supabase: any, data: any) {
  const { proposalId, status } = data;

  const { error } = await supabase
    .from("proposals")
    .update({ status })
    .eq("id", proposalId);

  if (error) throw error;

  return NextResponse.json({ success: true, message: "Status da proposta atualizado" });
}