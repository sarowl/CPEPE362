import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function PATCH(req: Request) {
  try {
    const { forum_id } = await req.json();
    if (!forum_id) {
      return NextResponse.json({ error: "Missing forum_id" }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("ForumPost")
      .update({ is_reported: false, report_reason: null })
      .eq("forum_id", forum_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}