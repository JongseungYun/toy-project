import "server-only";
import { createClient } from "@supabase/supabase-js";

export function recoveryConfig() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  const mailKey = process.env.RESEND_API_KEY;
  const sender = process.env.RECOVERY_EMAIL_FROM;
  const rawOrigin = process.env.RECOVERY_APP_ORIGIN;
  if (!secret || !mailKey || !sender || !rawOrigin) return null;
  try {
    const url = new URL(rawOrigin);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return null;
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    return { secret, mailKey, sender, origin: url.origin };
  } catch {
    return null;
  }
}

export type RecoveryConfig = NonNullable<ReturnType<typeof recoveryConfig>>;

export function recoveryDatabase(config: RecoveryConfig) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, config.secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function passwordCheckClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
}
