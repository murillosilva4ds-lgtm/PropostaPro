import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-server";
import { isAdminIdentity } from "@/lib/admin-policy";

export async function GET(request: Request) {
  const context = await getAdminContext();
  if (!context) return NextResponse.json({ erro: "Acesso não autorizado." }, { status: 403 });

  const url = new URL(request.url);
  const page = Math.max(1, Math.min(10000, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1));
  const perPage = 50;
  const { data, error } = await context.admin.auth.admin.listUsers({ page, perPage });
  if (error) return NextResponse.json({ erro: "Não foi possível listar usuários." }, { status: 502 });

  const ids = data.users.map((user) => user.id);
  if (ids.length === 0) return NextResponse.json({ users: [], page, hasMore: false });

  const [{ data: profiles, error: profilesError }, { data: grants, error: grantsError }] = await Promise.all([
    context.admin.from("profiles").select("id, nome, plano, propostas_criadas_no_mes").in("id", ids),
    context.admin.from("admin_plan_grants").select("user_id, plan, reason, created_at").in("user_id", ids)
  ]);
  if (profilesError || grantsError) {
    return NextResponse.json({ erro: "Não foi possível carregar dados administrativos." }, { status: 500 });
  }

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const grantById = new Map((grants ?? []).map((grant) => [grant.user_id, grant]));
  const users = data.users.map((user) => ({
    id: user.id,
    email: user.email ?? "",
    emailConfirmed: Boolean(user.email_confirmed_at),
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at,
    protectedAdmin: isAdminIdentity(user),
    nome: profileById.get(user.id)?.nome ?? user.user_metadata?.nome ?? "",
    plan: profileById.get(user.id)?.plano ?? "gratuito",
    proposalsUsed: profileById.get(user.id)?.propostas_criadas_no_mes ?? 0,
    manualGrant: grantById.get(user.id) ?? null
  }));

  return NextResponse.json({ users, page, hasMore: data.users.length === perPage });
}
