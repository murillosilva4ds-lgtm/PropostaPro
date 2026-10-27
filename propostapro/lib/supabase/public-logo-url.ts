export function publicLogoUrl(value: unknown, supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL): string | null {
  if (typeof value !== "string" || !supabaseUrl) return null;

  try {
    const project = new URL(supabaseUrl);
    const logo = new URL(value);
    const isLocalProject = project.protocol === "http:" && ["localhost", "127.0.0.1"].includes(project.hostname);
    const isSecureProtocol = logo.protocol === "https:" || (isLocalProject && logo.protocol === "http:");

    if (
      !isSecureProtocol ||
      logo.origin !== project.origin ||
      logo.username ||
      logo.password ||
      logo.search ||
      logo.hash ||
      !logo.pathname.startsWith("/storage/v1/object/public/logos/")
    ) {
      return null;
    }

    return logo.toString();
  } catch {
    return null;
  }
}
