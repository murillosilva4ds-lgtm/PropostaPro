import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { BrandForm } from "@/components/dashboard/brand-form";

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: marca }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user!.id).single(),
    supabase.from("brand_settings").select("*").eq("user_id", user!.id).single()
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Perfil e configurações</h1>
        <p className="mt-1 text-sm text-gray-500">Gerencie seus dados pessoais e a identidade visual das propostas.</p>
      </div>

      <section className="card p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Dados pessoais</h2>
        <ProfileForm profile={profile} email={user!.email ?? ""} />
      </section>

      <section className="card p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Identidade visual</h2>
        <p className="mb-4 text-xs text-gray-500">Logotipo e nome da empresa aparecem automaticamente na capa de todas as propostas e no PDF.</p>
        <BrandForm marca={marca} />
      </section>
    </div>
  );
}
