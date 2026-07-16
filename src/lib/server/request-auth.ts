import { resolveAccountRole } from "@/lib/auth/roles";
import { createSupabaseAuthClient } from "@/lib/supabase/server";

export type RequestUser = {
  email: string | null;
  id: string;
  role: "user" | "admin";
};

export async function getRequestUserFromAccessToken(accessToken: string) {
  const authClient = createSupabaseAuthClient(accessToken);
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser();

  if (error || !user) {
    return null;
  }

  return {
    email: user.email ?? null,
    id: user.id,
    role: resolveAccountRole(user.email) === "admin" ? "admin" : "user",
  } satisfies RequestUser;
}
