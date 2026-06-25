import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for privileged Auth Admin operations
 * (e.g. auth.admin.generateLink). Bypasses RLS — server-only, never
 * import this from a Client Component.
 */
export function createAdminClient() {
  const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase admin client misconfigured: falta SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
