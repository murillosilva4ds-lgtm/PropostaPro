import type { ProposalItem } from "@/types/database";

export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);
}

export function formatarData(data: string | Date | null | undefined): string {
  if (!data) return "—";
  const d = typeof data === "string" ? new Date(data) : data;
  return new Intl.DateTimeFormat("pt-BR").format(d);
}

export function calcularTotaisItens(
  itens: Pick<ProposalItem, "quantidade" | "valor_unitario" | "desconto">[],
  taxas = 0
) {
  const subtotal = itens.reduce((acc, item) => acc + item.quantidade * item.valor_unitario, 0);
  const descontoTotal = itens.reduce((acc, item) => acc + (item.desconto || 0), 0);
  const valorTotal = subtotal - descontoTotal + taxas;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    descontoTotal: Math.round(descontoTotal * 100) / 100,
    valorTotal: Math.round(valorTotal * 100) / 100
  };
}

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  aprovada: "Aprovada",
  recusada: "Recusada",
  expirada: "Expirada"
};

export const STATUS_COLOR: Record<string, string> = {
  rascunho: "bg-gray-100 text-gray-700",
  enviada: "bg-blue-50 text-blue-700",
  aprovada: "bg-green-50 text-green-700",
  recusada: "bg-red-50 text-red-700",
  expirada: "bg-amber-50 text-amber-700"
};
