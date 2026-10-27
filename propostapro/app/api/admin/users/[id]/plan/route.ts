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

  const { data: effectivePlan, error } = await context.admin.rpc("set_admin_plan_grant", {
    p_actor_user_id: context.user.id,
    p_target_user_id: parsedId.data,
    p_plan: parsedBody.data.plan as PlanTier,
    p_reason: parsedBody.data.reason
  });
  if (error) return NextResponse.json({ erro: "Não foi possível alterar o plano." }, { status: 500 });

  return NextResponse.json({ ok: true, plan: parsedBody.data.plan, effectivePlan });
}
