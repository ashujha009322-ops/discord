import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * ONE browser Supabase client for the whole app (so there is one WebSocket,
 * not one per component). It is only used for Realtime; all data access goes
 * through server actions + Prisma.
 *
 * Authentication follows Clerk's documented third-party-auth pattern: the
 * `accessToken` option supplies the Clerk session token. Realtime calls it
 * whenever `realtime.setAuth()` runs. Because of that option, `client.auth.*`
 * is intentionally unavailable on this client.
 *
 * Client-side only: import it from client components / hooks, never from
 * server code (server code uses `supabaseAdmin`).
 */

let client: SupabaseClient | null = null;

let getToken: () => Promise<string | null> = async () => null;

/** The hook points this at the current Clerk session. */
export function setSupabaseTokenGetter(getter: () => Promise<string | null>) {
  getToken = getter;
}

export function getSupabaseBrowserClient(): SupabaseClient {
  if (client) return client;

  // Both variable names are referenced literally so Next.js can inline them
  // into the browser bundle (dynamic `process.env[name]` lookups are not inlined).
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY " +
        "(or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).",
    );
  }

  client = createClient(url, key, {
    accessToken: () => getToken(),
  });
  return client;
}
