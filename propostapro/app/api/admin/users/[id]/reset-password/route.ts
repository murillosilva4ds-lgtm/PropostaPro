import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin-server";
import { isAdminIdentity } from "@/lib/admin-policy";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAdminContext();
  if (!context) return NextResponse.json({ erro: "Acesso não autorizado." }, { status: 403 });

  const { id } = await params;
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) return NextResponse.json({ erro: "Usuário inválido." }, { status: 400 });

  const { data, error: lookupError } = await context.admin.auth.admin.getUserById(parsedId.data);
  if (lookupError || !data.user?.email) return NextResponse.json({ erro: "Usuário não encontrado." }, { status: 404 });
  if (isAdminIdentity(data.user)) {
    return NextResponse.json({ erro: "Use o fluxo de recuperação de senha para contas administrativas." }, { status: 403 });
  }

  let appUrl: URL;
  try {
    appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "");
  } catch {
    return NextResponse.json({ erro: "URL pública do app não configurada." }, { status: 503 });
  }
  if (appUrl.protocol !== "https:" && !(appUrl.protocol === "http:" && appUrl.hostname === "localhost")) {
    return NextResponse.json({ erro: "URL pública do app inválida." }, { status: 503 });
  }

  const { data: audit, error: auditError } = await context.admin
    .from("admin_audit_logs")
    .insert({
      actor_user_id: context.user.id,
      target_user_id: parsedId.data,
      action: "password_reset_requested",
      details: { status: "requested" }
    })
    .select("id")
    .single();
  if (auditError || !audit) return NextResponse.json({ erro: "Não foi possível registrar a ação." }, { status: 500 });

  const { error } = await context.admin.auth.resetPasswordForEmail(data.user.email, {
    redirectTo: new URL("/redefinir-senha", appUrl).toString()
  });
  if (error) {
    await context.admin.from("admin_audit_logs").update({ details: { status: "failed" } }).eq("id", audit.id);
    return NextResponse.json({ erro: "Não foi possível enviar o e-mail de recuperação." }, { status: 502 });
  }

  await context.admin.from("admin_audit_logs").update({ details: { status: "sent" } }).eq("id", audit.id);
  return NextResponse.json({ ok: true });
}
