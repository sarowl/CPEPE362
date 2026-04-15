import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const { forum_id } = await req.json();

    if (!forum_id) {
      return NextResponse.json({ error: "Missing forum_id" }, { status: 400 });
    }

    const { error } = await supabase
      .from("ForumPost")
      .delete()
      .eq("forum_id", forum_id)
      .eq("user_id", authData.user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}