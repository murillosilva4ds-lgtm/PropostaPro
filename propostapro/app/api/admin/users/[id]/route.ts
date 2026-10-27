import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin-server";
import { isAdminIdentity } from "@/lib/admin-policy";

const deleteSchema = z.object({ confirmEmail: z.string().email() });

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAdminContext();
  if (!context) return NextResponse.json({ erro: "Acesso não autorizado." }, { status: 403 });

  const { id } = await params;
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) return NextResponse.json({ erro: "Usuário inválido." }, { status: 400 });
  if (parsedId.data === context.user.id) {
    return NextResponse.json({ erro: "Não é permitido excluir a própria conta administrativa." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsedBody = deleteSchema.safeParse(body);
  if (!parsedBody.success) return NextResponse.json({ erro: "Confirmação inválida." }, { status: 400 });

  const { data, error: lookupError } = await context.admin.auth.admin.getUserById(parsedId.data);
  const target = data.user;
  if (lookupError || !target?.email) return NextResponse.json({ erro: "Usuário não encontrado." }, { status: 404 });
  if (isAdminIdentity(target)) return NextResponse.json({ erro: "Não é permitido excluir uma conta administrativa." }, { status: 403 });
  if (parsedBody.data.confirmEmail.trim().toLowerCase() !== target.email.trim().toLowerCase()) {
    return NextResponse.json({ erro: "O e-mail de confirmação não corresponde." }, { status: 400 });
  }

  const { data: audit, error: auditError } = await context.admin
    .from("admin_audit_logs")
    .insert({
      actor_user_id: context.user.id,
      target_user_id: parsedId.data,
      action: "user_deleted",
      details: { status: "requested" }
    })
    .select("id")
    .single();
  if (auditError || !audit) return NextResponse.json({ erro: "Não foi possível registrar a ação." }, { status: 500 });

  const { error } = await context.admin.auth.admin.deleteUser(parsedId.data);
  if (error) {
    await context.admin.from("admin_audit_logs").update({ details: { status: "failed" } }).eq("id", audit.id);
    return NextResponse.json({ erro: "Não foi possível excluir o usuário." }, { status: 502 });
  }

  await context.admin.from("admin_audit_logs").update({ details: { status: "completed" } }).eq("id", audit.id);
  return NextResponse.json({ ok: true });
}
