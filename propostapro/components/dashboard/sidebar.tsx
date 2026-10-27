"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const ITENS = [
  { href: "/dashboard", label: "Painel" },
  { href: "/propostas", label: "Propostas" },
  { href: "/clientes", label: "Clientes" },
  { href: "/modelos", label: "Modelos" },
  { href: "/assinatura", label: "Assinatura" },
  { href: "/perfil", label: "Perfil" }
];

export function Sidebar({ nome, plano, isAdmin = false }: { nome: string; plano: string; isAdmin?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-100 bg-white px-4 py-6 md:flex">
      <Link href="/dashboard" className="px-2 text-lg font-semibold tracking-tight text-gray-900">
        PropostaPro
      </Link>

      <nav className="mt-8 flex-1 space-y-1">
        {[...ITENS, ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : [])].map((item) => {
          const ativo = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                ativo ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-100 pt-4">
        <p className="truncate px-2 text-sm font-medium text-gray-900">{nome}</p>
        <p className="px-2 text-xs capitalize text-gray-500">Plano {plano}</p>
        <button onClick={handleLogout} className="mt-3 w-full rounded-xl px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-50">
          Sair da conta
        </button>
      </div>
    </aside>
  );
}
