type AdminIdentity = {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
};

type AdminAllowlist = {
  ADMIN_EMAILS?: string;
  ADMIN_USER_IDS?: string;
};

export function isAdminIdentity(
  user: AdminIdentity | null | undefined,
  environment: AdminAllowlist = {
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
    ADMIN_USER_IDS: process.env.ADMIN_USER_IDS
  }
): boolean {
  if (!user) return false;

  const allowedIds = new Set((environment.ADMIN_USER_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean));
  const allowedEmails = new Set((environment.ADMIN_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
  const isVerified = Boolean(user.email_confirmed_at);

  return allowedIds.has(user.id) || (isVerified && allowedEmails.has(user.email?.trim().toLowerCase() ?? ""));
}
