'use client';

import { formatarMoeda } from "@/lib/utils";
import { AdminUsersManager } from "@/components/dashboard/admin-users-manager";
import dynamic from "next/dynamic";

// Importar gráficos dinamicamente
const BarChart = dynamic(() => import("recharts").then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then(m => m.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });
const Legend = dynamic(() => import("recharts").then(m => m.Legend), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });
const PieChart = dynamic(() => import("recharts").then(m => m.PieChart), { ssr: false });
const Pie = dynamic(() => import("recharts").then(m => m.Pie), { ssr: false });
const Cell = dynamic(() => import("recharts").then(m => m.Cell), { ssr: false });

interface AdminDashboardClientProps {
  totalUsuarios: number;
  totalPropostas: number;
  taxaAprovacao: string | number;
  valorTotalPlataforma: number;
  aprovadas: number;
  pendentes: number;
  mediaValor: number;
  statusData: Array<{ name: string; value: number; color: string }>;
  planoData: Array<{ name: string; value: number }>;
  ultimasPropostas: any[];
  adminUserId: string;
}

export function AdminDashboardClient({
  totalUsuarios,
  totalPropostas,
  taxaAprovacao,
  valorTotalPlataforma,
  aprovadas,
  pendentes,
  mediaValor,
  statusData,
  planoData,
  ultimasPropostas,
  adminUserId
}: AdminDashboardClientProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="pricing-eyebrow">Controle da plataforma</p>
        <h1 className="mt-1 text-3xl font-semibold text-gray-900">Administração</h1>
        <p className="mt-1 text-sm text-gray-500">Operações protegidas e registradas para auditoria.</p>
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card label="Usuários cadastrados" valor={totalUsuarios} highlight="blue" />
        <Card label="Propostas criadas" valor={totalPropostas} highlight="purple" />
        <Card label="Taxa de aprovação" valor={`${taxaAprovacao}%`} highlight="green" />
        <Card label="Valor total gerado" valor={formatarMoeda(valorTotalPlataforma)} highlight="orange" />
      </div>

      {/* Cards secundários */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Card label="Propostas aprovadas" valor={aprovadas} highlight="green" />
        <Card label="Propostas pendentes" valor={pendentes} highlight="yellow" />
        <Card label="Média por proposta" valor={formatarMoeda(mediaValor)} highlight="indigo" />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Gráfico de Status */}
        <div className="card p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Distribuição por Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Planos */}
        <div className="card p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Usuários por Plano</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={planoData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela de últimas propostas */}
      <div className="card p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Últimas Propostas</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left font-medium text-gray-600">ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Título</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Valor</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Data</th>
              </tr>
            </thead>
            <tbody>
              {(ultimasPropostas ?? []).map((proposta: any) => (
                <tr key={proposta.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{proposta.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-gray-900">{proposta.titulo}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                      proposta.status === "aprovada" ? "bg-green-100 text-green-800" :
                      proposta.status === "pendente" ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      {proposta.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 font-semibold">{formatarMoeda(proposta.valor_total)}</td>
                  <td className="px-4 py-3 text-gray-600">{new Date(proposta.created_at).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gerenciador de usuários */}
      <AdminUsersManager adminUserId={adminUserId} />
    </div>
  );
}

interface CardProps {
  label: string;
  valor: string | number;
  highlight?: "blue" | "purple" | "green" | "orange" | "yellow" | "indigo";
}

function Card({ label, valor, highlight = "blue" }: CardProps) {
  const bgColors = {
    blue: "bg-blue-50 border-blue-200",
    purple: "bg-purple-50 border-purple-200",
    green: "bg-green-50 border-green-200",
    orange: "bg-orange-50 border-orange-200",
    yellow: "bg-yellow-50 border-yellow-200",
    indigo: "bg-indigo-50 border-indigo-200"
  };

  const textColors = {
    blue: "text-blue-600",
    purple: "text-purple-600",
    green: "text-green-600",
    orange: "text-orange-600",
    yellow: "text-yellow-600",
    indigo: "text-indigo-600"
  };

  return (
    <div className={`card border p-5 ${bgColors[highlight]}`}>
      <p className="text-xs font-medium text-gray-600">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${textColors[highlight]}`}>{valor}</p>
    </div>
  );
}