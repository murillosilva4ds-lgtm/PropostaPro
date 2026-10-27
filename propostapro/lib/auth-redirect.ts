const INTERNAL_BASE_URL = "https://propostapro.invalid";

export function safeInternalRedirect(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/dashboard";
  }

  try {
    const destination = new URL(value, INTERNAL_BASE_URL);
    if (destination.origin !== INTERNAL_BASE_URL) return "/dashboard";
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return "/dashboard";
  }
}
