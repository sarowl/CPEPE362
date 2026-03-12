import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const { id, path } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Missing certification id" }, { status: 400 });
    }

    // Delete the DB record — enforce ownership via user_id in the where clause
    const { error: dbError } = await supabase
      .from("Certification")
      .delete()
      .eq("id", id)
      .eq("user_id", authData.user.id);

    if (dbError) throw dbError;

    // Best-effort removal from storage
    if (path) {
      const { error: storageError } = await supabase.storage
        .from("Autobot_Storage")
        .remove([path]);

      if (storageError) {
        console.warn("Storage deletion failed (non-fatal):", storageError.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Certification delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 }
    );
  }
}
