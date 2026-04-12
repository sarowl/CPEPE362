// ================================================================
// PURPOSE: Delete a user — removes from Users table AND from
// 
// ================================================================

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { isAdminEmail } from "@/lib/adminAccounts";

export async function DELETE(req: Request) {
  try {
    const adminEmail = req.headers.get("x-admin-email") ?? "";
    if (!adminEmail || !isAdminEmail(adminEmail))
      return NextResponse.json({ error: "Forbidden — admin only." }, { status: 403 });

    const body = await req.json();
    const user_id: string = body?.user_id ?? "";
    if (!user_id)
      return NextResponse.json({ error: "user_id is required." }, { status: 400 });

    const supabase = createAdminClient();

    // 1. Delete from Users table (FK cascades delete related rows)
    const { error: dbErr } = await supabase
      .from("Users")
      .delete()
      .eq("user_id", user_id);

    if (dbErr)
      return NextResponse.json({ error: dbErr.message }, { status: 500 });

    // 2. Delete from Supabase Auth (only possible with service role key)
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (svcKey) {
      const { createClient } = await import("@supabase/supabase-js");
      const authAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        svcKey,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { error: authErr } = await authAdmin.auth.admin.deleteUser(user_id);
      if (authErr) {
        // Auth delete failed but DB row is already gone — log and continue
        console.warn("Auth user delete warning:", authErr.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
