import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin-server";
import { isAdminIdentity } from "@/lib/admin-policy";
import type { PlanTier } from "@/types/database";

const requestSchema = z.object({
  plan: z.enum(["gratuito", "pro", "premium"]),
  reason: z.string().trim().min(3).max(500)
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAdminContext();
  console.log("POST /plan chamado, contexto:", !!context);

  if (!context) return NextResponse.json({ erro: "Acesso não autorizado." }, { status: 403 });

  const { id } = await params;
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) return NextResponse.json({ erro: "Usuário inválido." }, { status: 400 });

  const body = await request.json().catch(() => null);
  const parsedBody = requestSchema.safeParse(body);
  if (!parsedBody.success) return NextResponse.json({ erro: "Plano ou justificativa inválidos." }, { status: 400 });

  const { data: targetResult, error: targetError } = await context.admin.auth.admin.getUserById(parsedId.data);
  if (targetError || !targetResult.user) return NextResponse.json({ erro: "Usuário não encontrado." }, { status: 404 });
  if (isAdminIdentity(targetResult.user)) {
    return NextResponse.json({ erro: "Não é permitido alterar o plano de uma conta administrativa." }, { status: 403 });
  }

  console.log("Tentando upsert em admin_plan_grants para user:", parsedId.data);

  // Inserir ou atualizar no admin_plan_grants
  const { error: grantError } = await context.admin
    .from("admin_plan_grants")
    .upsert({
      user_id: parsedId.data,
      plan: parsedBody.data.plan,
      reason: parsedBody.data.reason,
      granted_by: context.user.id,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });

  if (grantError) {
    console.error("admin_plan_grants upsert error:", grantError);
    return NextResponse.json({ erro: "Não foi possível alterar o plano." }, { status: 500 });
  }

  console.log("Upsert em admin_plan_grants OK, atualizando profiles...");

  // Atualizar o plano em profiles
  const { error: profileError } = await context.admin
    .from("profiles")
    .update({ plano: parsedBody.data.plan })
    .eq("id", parsedId.data);

  if (profileError) {
    console.error("profiles update error:", profileError);
    return NextResponse.json({ erro: "Não foi possível alterar o plano." }, { status: 500 });
  }

  console.log("Update em profiles OK, registrando em audit logs...");

  // Registrar em audit logs
  const { error: auditError } = await context.admin
    .from("admin_audit_logs")
    .insert({
      actor_user_id: context.user.id,
      target_user_id: parsedId.data,
      action: "plan_changed",
      details: {
        requested_plan: parsedBody.data.plan,
        effective_plan: parsedBody.data.plan,
        reason: parsedBody.data.reason
      }
    });

  if (auditError) {
    console.error("admin_audit_logs insert error:", auditError);
  }

  console.log("Operação concluída com sucesso!");

  const effectivePlan = parsedBody.data.plan;

  return NextResponse.json({ ok: true, plan: parsedBody.data.plan, effectivePlan });
}