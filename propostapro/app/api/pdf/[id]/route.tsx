import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { PropostaDocumento } from "@/lib/pdf/proposta-documento";
import { publicLogoUrl } from "@/lib/supabase/public-logo-url";
import type { Proposal, ProposalItem } from "@/types/database";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return new Response("Não autenticado.", { status: 401 });

  const { data: proposta } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single<Proposal>();

  if (!proposta) return new Response("Proposta não encontrada.", { status: 404 });

  const { data: itens } = await supabase
    .from("proposal_items")
    .select("*")
    .eq("proposal_id", proposta.id)
    .order("ordem")
    .returns<ProposalItem[]>();

  const { data: marca } = await supabase
    .from("brand_settings")
    .select("nome_empresa, logo_url, site")
    .eq("user_id", user.id)
    .single();

  const buffer = await renderToBuffer(
    <PropostaDocumento
      proposta={{ ...proposta, items: itens ?? [] }}
      marca={marca ? { ...marca, logo_url: publicLogoUrl(marca.logo_url) } : null}
    />
  );

  const nomeArquivo = `${proposta.nome_projeto.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`
    }
  });
}
