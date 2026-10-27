import "server-only";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { isAdminIdentity } from "@/lib/admin-policy";

export async function getAdminContext() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || !isAdminIdentity(user)) return null;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;

  return { user, admin: createServiceRoleClient() };
}
