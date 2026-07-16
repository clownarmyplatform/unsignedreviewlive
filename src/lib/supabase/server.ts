import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { getSupabaseEnv } from "@/lib/supabase/env";

export function createSupabaseAuthClient(accessToken: string) {
  const { url, anonKey } = getSupabaseEnv();

  return createClient<Database>(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

export function createSupabaseServiceRoleClient() {
  const { url } = getSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "Missing required Supabase environment variable: SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient<Database>(url, serviceRoleKey);
}
