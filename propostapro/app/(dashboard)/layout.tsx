import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";
import { isAdminIdentity } from "@/lib/admin-policy";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("nome, plano").eq("id", user.id).single();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar nome={profile?.nome ?? user.email ?? "Minha conta"} plano={profile?.plano ?? "gratuito"} isAdmin={isAdminIdentity(user)} />
      <main className="flex-1 px-5 py-6 md:px-10 md:py-8">{children}</main>
    </div>
  );
}
