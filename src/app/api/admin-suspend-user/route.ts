import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { isAdminEmail } from "@/lib/adminAccounts";

export async function POST(req: Request) {
  try {
    const adminEmail = req.headers.get("x-admin-email") ?? "";
    if (!adminEmail || !isAdminEmail(adminEmail))
      return NextResponse.json({ error: "Forbidden — admin only." }, { status: 403 });

    const body = await req.json();
    const user_id: string = body?.user_id ?? "";
    const suspend: boolean = body?.suspend ?? true;

    if (!user_id)
      return NextResponse.json({ error: "user_id is required." }, { status: 400 });

    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!svcKey)
      return NextResponse.json({ error: "Service role key not configured." }, { status: 500 });

    const { createClient } = await import("@supabase/supabase-js");
    const authAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      svcKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    if (suspend) {
      // Mark user as suspended in metadata
      const { error: metaErr } = await authAdmin.auth.admin.updateUserById(user_id, {
        user_metadata: { suspended: true },
      });

      if (metaErr) {
        return NextResponse.json(
          { error: `Failed to suspend user: ${metaErr.message}` },
          { status: 500 }
        );
      }

      // Revoke all refresh tokens to force logout
      const { error: revokeErr } = await authAdmin.auth.admin.updateUserById(user_id, {
        ban_duration: "none",
        banned_until: new Date(2099, 11, 31).toISOString(),
      } as any);

      if (revokeErr) {
        console.warn("Warning: could not set ban_until:", revokeErr);
      }
    } else {
      // Mark user as active
      const { error: metaErr } = await authAdmin.auth.admin.updateUserById(user_id, {
        user_metadata: { suspended: false },
      });

      if (metaErr) {
        return NextResponse.json(
          { error: `Failed to activate user: ${metaErr.message}` },
          { status: 500 }
        );
      }

      // Remove ban
      const { error: unbanErr } = await authAdmin.auth.admin.updateUserById(user_id, {
        ban_duration: "none",
        banned_until: null,
      } as any);

      if (unbanErr) {
        console.warn("Warning: could not remove ban_until:", unbanErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: suspend ? "User suspended successfully." : "User activated successfully.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
