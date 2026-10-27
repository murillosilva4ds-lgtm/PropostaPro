import { createClient } from "@/lib/supabase/server";
import { PropostaWizard } from "@/components/propostas/wizard";
import type { Client, Template } from "@/types/database";

export default async function NovaPropostaPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [{ data: clientes }, { data: templates }] = await Promise.all([
    supabase.from("clients").select("*").eq("user_id", user!.id).order("nome").returns<Client[]>(),
    supabase.from("templates").select("*").order("titulo").returns<Template[]>()
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-gray-900">Criar nova proposta</h1>
      <p className="mt-1 text-sm text-gray-500">Preencha as etapas abaixo para gerar sua proposta comercial.</p>
      <div className="mt-6">
        <PropostaWizard clientes={clientes ?? []} templates={templates ?? []} />
      </div>
    </div>
  );
}
