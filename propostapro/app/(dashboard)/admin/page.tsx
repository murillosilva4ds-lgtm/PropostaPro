import { createServiceRoleClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { formatarMoeda } from "@/lib/utils";
import { AdminUsersManager } from "@/components/dashboard/admin-users-manager";
import { AdminDashboardClient } from "./admin-dashboard-client";

export default async function AdminPage() {
  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return null;

  const supabase = createServiceRoleClient();

  // Buscar dados principais
  const [
    { count: totalUsuarios },
    { count: totalPropostas },
    { data: propostas },
    { data: porPlano },
    { data: ultimasPropostas }
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("proposals").select("*", { count: "exact", head: true }),
    supabase.from("proposals").select("valor_total, status, created_at"),
    supabase.from("profiles").select("plano"),
    supabase.from("proposals").select("id, titulo, status, valor_total, created_at").order("created_at", { ascending: false }).limit(5)
  ]);

  // Calcular métricas
  const valorTotalPlataforma = (propostas ?? []).reduce((acc: number, p: any) => acc + Number(p.valor_total || 0), 0);
  const aprovadas = (propostas ?? []).filter((p: any) => p.status === "aprovada").length;
  const pendentes = (propostas ?? []).filter((p: any) => p.status === "pendente").length;
  const rejeitadas = (propostas ?? []).filter((p: any) => p.status === "rejeitada").length;

  // Contar por plano
  const contagemPlanos = (porPlano ?? []).reduce((acc: Record<string, number>, p: any) => {
    acc[p.plano || "gratuito"] = (acc[p.plano || "gratuito"] ?? 0) + 1;
    return acc;
  }, {});

  // Média de valor por proposta
  const mediaValor = (propostas ?? []).length > 0 
    ? valorTotalPlataforma / (propostas ?? []).length 
    : 0;

  // Taxa de aprovação
  const taxaAprovacao = (propostas ?? []).length > 0 
    ? ((aprovadas / (propostas ?? []).length) * 100).toFixed(1)
    : 0;

  // Dados para gráficos
  const statusData = [
    { name: "Aprovadas", value: aprovadas, color: "#10b981" },
    { name: "Pendentes", value: pendentes, color: "#f59e0b" },
    { name: "Rejeitadas", value: rejeitadas, color: "#ef4444" }
  ];

  const planoData = Object.entries(contagemPlanos).map(([plano, qtd]) => ({
    name: plano.charAt(0).toUpperCase() + plano.slice(1),
    value: qtd
  }));

  // Passar dados para o Client Component
  return (
    <AdminDashboardClient
      totalUsuarios={totalUsuarios}
      totalPropostas={totalPropostas}
      taxaAprovacao={taxaAprovacao}
      valorTotalPlataforma={valorTotalPlataforma}
      aprovadas={aprovadas}
      pendentes={pendentes}
      mediaValor={mediaValor}
      statusData={statusData}
      planoData={planoData}
      ultimasPropostas={ultimasPropostas}
      adminUserId={user.id}
    />
  );
}