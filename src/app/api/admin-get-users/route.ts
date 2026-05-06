import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/adminAccounts";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  try {
    const adminEmail = req.headers.get("x-admin-email") ?? "";
    if (!adminEmail || !isAdminEmail(adminEmail))
      return NextResponse.json({ error: "Forbidden — admin only." }, { status: 403 });

    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!svcKey)
      return NextResponse.json({ error: "Service role key not configured." }, { status: 500 });

    const authAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      svcKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Fetch non-deleted profiles
    const { data: profiles, error: profileErr } = await authAdmin
      .from("Users")
      .select("user_id, name, created_at")
      .neq("status", "Deleted")
      .order("created_at", { ascending: false });

    if (profileErr)
      return NextResponse.json({ error: profileErr.message }, { status: 500 });

    // Fetch auth users to get banned_until
    const { data: { users: authUsers }, error: authErr } = await authAdmin.auth.admin.listUsers({
      perPage: 1000,
    });

    if (authErr)
      return NextResponse.json({ error: authErr.message }, { status: 500 });

    const authMap = new Map(authUsers.map((u) => [u.id, u]));

    const result = (profiles ?? []).map((p: any) => {
      const authUser = authMap.get(p.user_id);
      const bannedUntil = (authUser as any)?.banned_until;
      const isSuspended = bannedUntil && new Date(bannedUntil) > new Date();

      return {
        user_id: p.user_id,
        name: p.name ?? "Unknown",
        email: authUser?.email ?? "—",
        created_at: p.created_at,
        last_sign_in_at: authUser?.last_sign_in_at ?? null,
        status: isSuspended ? "Suspended" : "Active",
        provider: authUser?.app_metadata?.provider ?? authUser?.identities?.[0]?.provider ?? "email",
      };
    });

    return NextResponse.json({ users: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}