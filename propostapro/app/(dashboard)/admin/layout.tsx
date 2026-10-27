import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminIdentity } from "@/lib/admin-policy";

/**
 * Restringe o acesso à área administrativa. Marque o(s) e-mail(s) de
 * administrador em ADMIN_EMAILS (variável de ambiente, separada por vírgula)
 * ou substitua por uma coluna `is_admin` em `profiles` se preferir.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!isAdminIdentity(user)) {
    redirect("/dashboard");
  }

  return <div>{children}</div>;
}
