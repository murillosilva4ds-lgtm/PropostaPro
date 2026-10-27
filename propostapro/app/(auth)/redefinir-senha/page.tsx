"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { createClient } from "@/lib/supabase/client";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const supabase = createClient();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function redefinir(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (senha !== confirmacao) {
      setErro("As senhas não coincidem.");
      return;
    }

    setSalvando(true);
    const { data: { session }, error: erroSessao } = await supabase.auth.getSession();
    if (erroSessao || !session) {
      setSalvando(false);
      setErro("Este link de recuperação é inválido ou expirou. Solicite outro.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);
    if (error) {
      setErro("Não foi possível redefinir a senha. Solicite um novo link e tente novamente.");
      return;
    }

    router.replace("/dashboard");
  }

  return (
    <AuthShell titulo="Defina uma nova senha" subtitulo="Escolha uma senha com pelo menos 6 caracteres.">
      <form onSubmit={redefinir} className="space-y-4">
        <div>
          <label className="label" htmlFor="nova-senha">Nova senha</label>
          <input
            id="nova-senha"
            type="password"
            className="input"
            autoComplete="new-password"
            minLength={6}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="confirmar-senha">Confirmar nova senha</label>
          <input
            id="confirmar-senha"
            type="password"
            className="input"
            autoComplete="new-password"
            minLength={6}
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            required
          />
        </div>
        {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}
        <button type="submit" disabled={salvando} className="btn-primary w-full">
          {salvando ? "Salvando..." : "Redefinir senha"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-600">
        <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">Voltar ao login</Link>
      </p>
    </AuthShell>
  );
}
