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
    const confirm_name: string = body?.confirm_name ?? "";

    if (!user_id)
      return NextResponse.json({ error: "user_id is required." }, { status: 400 });

    if (!confirm_name)
      return NextResponse.json({ error: "confirm_name is required for safety." }, { status: 400 });

    const supabase = createAdminClient();

    // 0. Verify the user exists and confirm_name matches
    const { data: userRow, error: fetchErr } = await supabase
      .from("Users")
      .select("user_id, name")
      .eq("user_id", user_id)
      .single();

    if (fetchErr || !userRow)
      return NextResponse.json({ error: "User not found." }, { status: 404 });

    if ((userRow.name ?? "").trim().toLowerCase() !== confirm_name.trim().toLowerCase())
      return NextResponse.json(
        { error: "Confirmation name does not match. Deletion cancelled." },
        { status: 400 }
      );

    // 1. Soft delete: mark status as Deleted in Users table
    const { error: updateErr } = await supabase
      .from("Users")
      .update({ status: "Deleted" })
      .eq("user_id", user_id);

    if (updateErr)
      return NextResponse.json({ error: updateErr.message }, { status: 500 });

    // 2. Remove from auth.users so the email can be re-registered
    const { error: authDeleteErr } = await supabase.auth.admin.deleteUser(user_id);
    if (authDeleteErr)
      console.warn("Could not remove from auth:", authDeleteErr.message);

    return NextResponse.json({
      success: true,
      message: "User has been deleted.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}