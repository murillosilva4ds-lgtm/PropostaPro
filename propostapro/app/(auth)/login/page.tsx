"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthShell, Divisor } from "@/components/auth-shell";
import { safeInternalRedirect } from "@/lib/auth-redirect";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthShell titulo="Entrar na sua conta" subtitulo="Acesse seu painel e suas propostas.">
          <p className="text-sm text-gray-500">Carregando...</p>
        </AuthShell>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

    setCarregando(false);

    if (error) {
      setErro("E-mail ou senha incorretos.");
      return;
    }

    router.push(safeInternalRedirect(searchParams.get("redirect")));
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/dashboard` }
    });
  }

  return (
    <AuthShell titulo="Entrar na sua conta" subtitulo="Acesse seu painel e suas propostas.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">E-mail</label>
          <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label">Senha</label>
            <Link href="/esqueci-senha" className="text-xs font-medium text-brand-600 hover:text-brand-700">Esqueci minha senha</Link>
          </div>
          <input type="password" className="input" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        </div>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <button type="submit" disabled={carregando} className="btn-primary w-full">
          {carregando ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <Divisor />

      <button onClick={handleGoogle} className="btn-secondary w-full">Continuar com Google</button>

      <p className="mt-6 text-center text-sm text-gray-600">
        Ainda não tem conta? <Link href="/cadastro" className="font-medium text-brand-600 hover:text-brand-700">Criar conta grátis</Link>
      </p>
    </AuthShell>
  );
}
