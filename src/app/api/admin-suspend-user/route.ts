import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { isAdminEmail } from "@/lib/adminAccounts";

export async function PATCH(req: Request) {
  try {
    const adminEmail = req.headers.get("x-admin-email") ?? "";
    if (!adminEmail || !isAdminEmail(adminEmail))
      return NextResponse.json({ error: "Forbidden — admin only." }, { status: 403 });

    const body = await req.json();
    const user_id: string = body?.user_id ?? "";
    const action: "suspend" | "activate" = body?.action;

    if (!user_id)
      return NextResponse.json({ error: "user_id is required." }, { status: 400 });
    if (action !== "suspend" && action !== "activate")
      return NextResponse.json({ error: "action must be 'suspend' or 'activate'." }, { status: 400 });

    const suspend = action === "suspend";

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
      const { error } = await authAdmin.auth.admin.updateUserById(user_id, {
        ban_duration: "876600h",
      });
      if (error)
        return NextResponse.json({ error: `Failed to suspend: ${error.message}` }, { status: 500 });
    } else {
      const { error } = await authAdmin.auth.admin.updateUserById(user_id, {
        ban_duration: "none",
      });
      if (error)
        return NextResponse.json({ error: `Failed to activate: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: suspend ? "User suspended." : "User activated.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}