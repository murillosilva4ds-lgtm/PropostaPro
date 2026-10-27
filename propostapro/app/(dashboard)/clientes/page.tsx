import { createClient } from "@/lib/supabase/server";
import type { Client } from "@/types/database";
import { ClientsManager } from "@/components/dashboard/clients-manager";

export default async function ClientesPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: clientes } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", user!.id)
    .order("nome")
    .returns<Client[]>();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Clientes</h1>
      <p className="mt-1 text-sm text-gray-500">Cadastre clientes para reutilizar os dados ao criar novas propostas.</p>
      <div className="mt-6">
        <ClientsManager clientesIniciais={clientes ?? []} />
      </div>
    </div>
  );
}
