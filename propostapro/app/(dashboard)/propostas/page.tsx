import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Proposal } from "@/types/database";
import { ProposalsTable } from "@/components/dashboard/proposals-table";

export default async function PropostasPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: propostas } = await supabase
    .from("proposals")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .returns<Proposal[]>();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Propostas</h1>
        <Link href="/propostas/novo" className="btn-primary">+ Criar nova proposta</Link>
      </div>
      <div className="mt-6">
        <ProposalsTable propostas={propostas ?? []} />
      </div>
    </div>
  );
}
