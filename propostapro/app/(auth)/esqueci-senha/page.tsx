"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth-shell";

export default function EsqueciSenhaPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/redefinir-senha`
    });
    setCarregando(false);
    setEnviado(true);
  }

  return (
    <AuthShell titulo="Recuperar senha" subtitulo="Enviaremos um link para redefinir sua senha.">
      {enviado ? (
        <p className="text-sm text-gray-700">
          Se existir uma conta com o e-mail <strong>{email}</strong>, você receberá um link de redefinição em instantes.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">E-mail</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <button type="submit" disabled={carregando} className="btn-primary w-full">
            {carregando ? "Enviando..." : "Enviar link de recuperação"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
