"use client";

import { useEffect, useState } from "react";
import type { PlanTier } from "@/types/database";

type AdminUser = {
  id: string;
  email: string;
  emailConfirmed: boolean;
  createdAt: string;
  lastSignInAt: string | null;
  nome: string;
  plan: PlanTier;
  proposalsUsed: number;
  protectedAdmin: boolean;
  manualGrant: { plan: "pro" | "premium"; reason: string; created_at: string } | null;
};

const labelPlano: Record<PlanTier, string> = {
  gratuito: "Gratuito",
  pro: "Pro",
  premium: "Premium"
};

export function AdminUsersManager({ adminUserId }: { adminUserId: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [busca, setBusca] = useState("");
  const [planos, setPlanos] = useState<Record<string, PlanTier>>({});
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string | null>(null);
  const [emailConfirmacao, setEmailConfirmacao] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [acao, setAcao] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  async function carregarUsuarios() {
    setCarregando(true);
    setErro(null);
    try {
      const response = await fetch(`/api/admin/users?page=${page}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro || "Não foi possível carregar usuários.");
      setUsers(data.users);
      setHasMore(data.hasMore);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível carregar usuários.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregarUsuarios();
  }, [page]);

  const usuariosFiltrados = users.filter((user) => {
    const termo = busca.trim().toLowerCase();
    return !termo || user.email.toLowerCase().includes(termo) || user.nome.toLowerCase().includes(termo);
  });

  async function salvarPlano(user: AdminUser) {
    const reason = motivos[user.id]?.trim();
    if (!reason || reason.length < 3) {
      setErro("Informe uma justificativa de pelo menos 3 caracteres para registrar a alteração.");
      return;
    }

    setAcao(`plan:${user.id}`);
    setErro(null);
    setSucesso(null);
    try {
      const response = await fetch(`/api/admin/users/${user.id}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planos[user.id] ?? user.plan, reason })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro || "Não foi possível alterar o plano.");
      setSucesso(`Plano efetivo de ${user.email}: ${labelPlano[data.effectivePlan as PlanTier]}. Grants manuais permanecem ativos até serem removidos.`);
      setMotivos((current) => ({ ...current, [user.id]: "" }));
      await carregarUsuarios();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível alterar o plano.");
    } finally {
      setAcao(null);
    }
  }

  async function enviarRecuperacao(user: AdminUser) {
    if (!window.confirm(`Enviar e-mail de recuperação de senha para ${user.email}?`)) return;
    setAcao(`reset:${user.id}`);
    setErro(null);
    setSucesso(null);
    try {
      const response = await fetch(`/api/admin/users/${user.id}/reset-password`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro || "Não foi possível enviar a recuperação.");
      setSucesso(`Solicitação de recuperação enviada para ${user.email}.`);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível enviar a recuperação.");
    } finally {
      setAcao(null);
    }
  }

  async function excluirUsuario(user: AdminUser) {
    setAcao(`delete:${user.id}`);
    setErro(null);
    setSucesso(null);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail: emailConfirmacao })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro || "Não foi possível excluir a conta.");
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setConfirmandoExclusao(null);
      setEmailConfirmacao("");
      setSucesso(`A conta ${user.email} foi excluída.`);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível excluir a conta.");
    } finally {
      setAcao(null);
    }
  }

  return (
    <section className="mt-8 space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="pricing-eyebrow">Controle da plataforma</p>
          <h2 className="mt-1 text-xl font-semibold text-gray-900">Usuários</h2>
          <p className="mt-1 text-sm text-gray-500">Grants manuais não alteram nem simulam pagamentos do Stripe.</p>
        </div>
        <div className="flex gap-2">
          <input
            type="search"
            className="input min-w-0 sm:w-72"
            placeholder="Buscar nesta página"
            aria-label="Buscar usuários nesta página"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
          />
          <button type="button" className="btn-secondary" onClick={() => void carregarUsuarios()} disabled={carregando}>
            Atualizar
          </button>
        </div>
      </div>

      {erro && <p role="alert" className="rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{erro}</p>}
      {sucesso && <p role="status" className="rounded-lg border border-green-400/20 bg-green-500/10 px-4 py-3 text-sm text-green-200">{sucesso}</p>}

      <div className="space-y-3">
        {carregando ? (
          <div className="card p-8 text-center text-sm text-gray-500">Carregando usuários...</div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="card p-8 text-center text-sm text-gray-500">Nenhum usuário nesta página corresponde à busca.</div>
        ) : usuariosFiltrados.map((user) => {
          const currentPlan = planos[user.id] ?? user.plan;
          const busy = acao?.endsWith(user.id) ?? false;
          return (
            <article key={user.id} className="card grid gap-5 p-5 lg:grid-cols-[minmax(220px,1.1fr)_minmax(280px,1fr)_minmax(220px,.8fr)] lg:items-center">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-semibold text-gray-900">{user.nome || "Sem nome"}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${user.emailConfirmed ? "bg-green-500/10 text-green-200" : "bg-amber-500/10 text-amber-200"}`}>
                    {user.emailConfirmed ? "Confirmado" : "Pendente"}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-gray-500">{user.email}</p>
                <p className="mt-2 text-xs text-gray-500">Plano {labelPlano[user.plan]} · {user.proposalsUsed} propostas neste ciclo</p>
                {user.manualGrant && <p className="mt-1 text-xs text-brand-300">Grant manual: {user.manualGrant.reason}</p>}
                <p className="mt-1 text-[11px] text-gray-500">Criado em {new Intl.DateTimeFormat("pt-BR").format(new Date(user.createdAt))}</p>
              </div>

              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <select
                    className="input min-w-0"
                    aria-label={`Plano para ${user.email}`}
                    value={currentPlan}
                    onChange={(event) => setPlanos((current) => ({ ...current, [user.id]: event.target.value as PlanTier }))}
                    disabled={user.protectedAdmin || busy}
                  >
                    <option value="gratuito">Gratuito / remover grant</option>
                    <option value="pro">Pro manual</option>
                    <option value="premium">Premium manual</option>
                  </select>
                  <button type="button" className="btn-primary shrink-0" onClick={() => void salvarPlano(user)} disabled={user.protectedAdmin || busy}>
                    Aplicar
                  </button>
                </div>
                <input
                  className="input"
                  aria-label={`Justificativa da alteração de plano para ${user.email}`}
                  placeholder="Justificativa para auditoria"
                  maxLength={500}
                  value={motivos[user.id] ?? ""}
                  onChange={(event) => setMotivos((current) => ({ ...current, [user.id]: event.target.value }))}
                  disabled={user.protectedAdmin || busy}
                />
              </div>

              <div className="flex flex-wrap gap-2 lg:justify-end">
                <button type="button" className="btn-secondary" onClick={() => void enviarRecuperacao(user)} disabled={user.protectedAdmin || busy}>
                  Enviar reset de senha
                </button>
                {user.id !== adminUserId && !user.protectedAdmin && (
                  confirmandoExclusao === user.id ? (
                    <div className="w-full space-y-2 rounded-lg border border-red-400/20 bg-red-500/5 p-3">
                      <label className="block text-xs text-gray-500" htmlFor={`confirmar-${user.id}`}>
                        Digite <span className="font-medium text-gray-300">{user.email}</span> para confirmar a exclusão permanente.
                      </label>
                      <input
                        id={`confirmar-${user.id}`}
                        type="email"
                        className="input"
                        autoComplete="off"
                        value={emailConfirmacao}
                        onChange={(event) => setEmailConfirmacao(event.target.value)}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => void excluirUsuario(user)}
                          disabled={busy || emailConfirmacao.trim().toLowerCase() !== user.email.toLowerCase()}
                        >
                          Excluir definitivamente
                        </button>
                        <button type="button" className="btn-secondary" onClick={() => { setConfirmandoExclusao(null); setEmailConfirmacao(""); }}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className="btn-danger" onClick={() => { setConfirmandoExclusao(user.id); setEmailConfirmacao(""); }} disabled={busy}>
                      Excluir usuário
                    </button>
                  )
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
        <p className="text-xs text-gray-500">Página {page} · 50 usuários por página</p>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1 || carregando}>
            Anterior
          </button>
          <button type="button" className="btn-secondary" onClick={() => setPage((value) => value + 1)} disabled={!hasMore || carregando}>
            Próxima
          </button>
        </div>
      </div>
    </section>
  );
}
