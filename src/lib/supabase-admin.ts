// src\lib\supabase-admin.ts
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url    = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL env var.");
  }

  // Use service role if available (full RLS bypass)
  if (svcKey) {
    return createClient(url, svcKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  // Fallback: plain anon client (no SSR cookie session binding)
  // Works when RLS policies allow anon reads on the relevant tables.
  if (!anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY env var.");
  }
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}