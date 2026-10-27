"use client";

import { useEffect, useState } from "react";

interface AdminStats {
  totalUsuarios: number;
  totalPropostas: number;
  valorTotal: number;
  taxaAprovacao: number;
  usuariosAtivos: number;
  receita: number;
}

export function AdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Esta função buscaria dados da API
        // Por enquanto, dados placeholder
        setStats({
          totalUsuarios: 142,
          totalPropostas: 856,
          valorTotal: 125400,
          taxaAprovacao: 78.5,
          usuariosAtivos: 94,
          receita: 42300
        });
      } catch (error) {
        console.error("Erro ao buscar estatísticas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    // Atualizar a cada 5 minutos
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !stats) {
    return <div className="text-gray-500">Carregando estatísticas...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          title="Usuários Ativos"
          value={stats.usuariosAtivos}
          change="+12%"
          icon="👥"
        />
        <StatCard
          title="Receita"
          value={`R$ ${(stats.receita / 1000).toFixed(1)}k`}
          change="+8%"
          icon="💰"
        />
        <StatCard
          title="Taxa Aprovação"
          value={`${stats.taxaAprovacao}%`}
          change="+2%"
          icon="✅"
        />
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  change: string;
  icon: string;
}

function StatCard({ title, value, change, icon }: StatCardProps) {
  return (
    <div className="card p-4 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
          <p className="mt-1 text-xs text-green-600 font-medium">{change}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}