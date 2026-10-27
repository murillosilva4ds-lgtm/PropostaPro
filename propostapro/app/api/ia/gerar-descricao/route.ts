import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { aiRequestSchema } from "@/lib/ai-request-schema";

/**
 * Gera descrições, escopo ou cronograma com uma API real de IA.
 * Requer ANTHROPIC_API_KEY (ou outro provedor) configurada no ambiente —
 * ver .env.example. Enquanto não houver chave, a rota retorna 503 em vez
 * de simular uma resposta de IA.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { data: permitido, error: erroRateLimit } = await supabase.rpc("consume_user_api_rate_limit", { p_bucket: "ai" });
  if (erroRateLimit) return NextResponse.json({ erro: "Não foi possível validar esta solicitação." }, { status: 500 });
  if (!permitido) return NextResponse.json({ erro: "Muitas solicitações. Aguarde um minuto e tente novamente." }, { status: 429 });

  const corpo = await request.json().catch(() => null);
  const entrada = aiRequestSchema.safeParse(corpo);
  if (!entrada.success) return NextResponse.json({ erro: "Dados inválidos ou contexto muito longo." }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { erro: "Recurso de IA ainda não configurado. Defina ANTHROPIC_API_KEY no ambiente para ativá-lo." },
      { status: 503 }
    );
  }

  const { error: erroPerfil } = await supabase.rpc("ensure_current_profile");
  if (erroPerfil) {
    return NextResponse.json({ erro: "Não foi possível preparar seu perfil." }, { status: 500 });
  }

  const { error: erroLimite } = await supabase.rpc("reserve_ai_usage");
  if (erroLimite?.message.includes("ai_quota_exceeded")) {
    return NextResponse.json(
      { erro: "Você atingiu o limite de usos de IA do seu plano este mês." },
      { status: 403 }
    );
  }
  if (erroLimite) return NextResponse.json({ erro: "Não foi possível validar o limite do seu plano." }, { status: 500 });

  const { tipo, contexto } = entrada.data;

  const prompts: Record<string, string> = {
    descricao: `Escreva uma descrição comercial profissional e objetiva (até 60 palavras) para o seguinte serviço, em português do Brasil: "${contexto}". Responda apenas com o texto da descrição, sem aspas.`,
    escopo: `Com base nesta informação sobre um projeto, sugira um escopo de trabalho estruturado em tópicos curtos, em português do Brasil: "${contexto}".`,
    cronograma: `Com base nesta informação sobre um projeto, sugira etapas de execução com prazos estimados, em português do Brasil: "${contexto}".`
  };

  const prompt = prompts[tipo];
  if (!prompt) return NextResponse.json({ erro: "Tipo de geração inválido." }, { status: 400 });

  let resposta: Response;
  try {
    resposta = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }]
      }),
      signal: AbortSignal.timeout(30000)
    });
  } catch {
    return NextResponse.json({ erro: "O serviço de IA não respondeu a tempo." }, { status: 502 });
  }

  if (!resposta.ok) {
    return NextResponse.json({ erro: "Não foi possível gerar o conteúdo com a IA no momento." }, { status: 502 });
  }

  const dados = await resposta.json().catch(() => null);
  const texto = z.object({
    content: z.array(z.object({ type: z.string(), text: z.string().optional() }))
  }).safeParse(dados).data?.content.find((bloco) => bloco.type === "text")?.text ?? "";

  return NextResponse.json({ texto });
}
