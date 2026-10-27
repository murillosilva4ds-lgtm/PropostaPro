import { createServiceRoleClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { formatarMoeda } from "@/lib/utils";
import { AdminUsersManager } from "@/components/dashboard/admin-users-manager";

export default async function AdminPage() {
  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return null;

  const supabase = createServiceRoleClient();

  const [{ count: totalUsuarios }, { count: totalPropostas }, { data: propostas }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("proposals").select("*", { count: "exact", head: true }),
    supabase.from("proposals").select("valor_total, status")
  ]);

  const valorTotalPlataforma = (propostas ?? []).reduce((acc: number, p: any) => acc + Number(p.valor_total || 0), 0);
  const aprovadas = (propostas ?? []).filter((p: any) => p.status === "aprovada").length;

  const { data: porPlano } = await supabase.from("profiles").select("plano");
  const contagemPlanos = (porPlano ?? []).reduce((acc: Record<string, number>, p: any) => {
    acc[p.plano] = (acc[p.plano] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div>
        <p className="pricing-eyebrow">Controle da plataforma</p>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">Administração</h1>
        <p className="mt-1 text-sm text-gray-500">Operações protegidas e registradas para auditoria.</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card label="Usuários cadastrados" valor={totalUsuarios ?? 0} />
        <Card label="Propostas criadas" valor={totalPropostas ?? 0} />
        <Card label="Propostas aprovadas" valor={aprovadas} />
        <Card label="Valor total gerado" valor={formatarMoeda(valorTotalPlataforma)} />
      </div>

      <div className="card mt-6 p-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Usuários por plano</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          {Object.entries(contagemPlanos).map(([plano, qtd]) => (
            <div key={plano} className="rounded-xl bg-gray-50 p-4 text-center">
              <p className="text-xs capitalize text-gray-500">{plano}</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{qtd as number}</p>
            </div>
          ))}
        </div>
      </div>

      <AdminUsersManager adminUserId={user.id} />
    </div>
  );
}

function Card({ label, valor }: { label: string; valor: string | number }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-gray-900">{valor}</p>
    </div>
  );
}
