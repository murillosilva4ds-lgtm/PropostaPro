"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthShell, Divisor } from "@/components/auth-shell";

export default function CadastroPage() {
  const router = useRouter();
  const supabase = createClient();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome } }
    });

    setCarregando(false);

    if (error) {
      setErro(traduzErro(error.message));
      return;
    }

    router.push("/dashboard");
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/dashboard` }
    });
  }

  return (
    <AuthShell titulo="Criar sua conta" subtitulo="Comece a enviar propostas profissionais hoje mesmo.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Nome completo</label>
          <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>
        <div>
          <label className="label">E-mail</label>
          <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label">Senha</label>
          <input type="password" className="input" minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} required />
        </div>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <button type="submit" disabled={carregando} className="btn-primary w-full">
          {carregando ? "Criando conta..." : "Criar conta"}
        </button>
      </form>

      <Divisor />

      <button onClick={handleGoogle} className="btn-secondary w-full">Continuar com Google</button>

      <p className="mt-6 text-center text-sm text-gray-600">
        Já tem uma conta? <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">Entrar</Link>
      </p>
    </AuthShell>
  );
}

function traduzErro(msg: string) {
  if (msg.includes("Password")) return "A senha precisa ter pelo menos 6 caracteres.";
  return "Não foi possível concluir. Verifique os dados e tente novamente.";
}
