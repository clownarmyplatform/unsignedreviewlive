import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceRoleKey) {
    return NextResponse.json(
      {
        error:
          "Account deletion is not configured yet. Add SUPABASE_SERVICE_ROLE_KEY on the server first.",
      },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    return NextResponse.json({ error: "Missing auth token." }, { status: 401 });
  }

  const publicClient = createClient<Database>(url, anonKey);
  const {
    data: { user },
    error: getUserError,
  } = await publicClient.auth.getUser(token);

  if (getUserError || !user) {
    return NextResponse.json(
      { error: "Could not verify the signed-in user." },
      { status: 401 },
    );
  }

  const adminClient = createClient<Database>(url, serviceRoleKey);
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id, true);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
