export function assertCanonicalSupabaseUrl(url: string): void {
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    throw new Error("A valid canonical Supabase URL is required");
  }

  if (hostname !== "zxqwtqlbrlegwdodjhiq.supabase.co") {
    throw new Error("Terminal OS may only connect to the canonical Supabase project");
  }
}