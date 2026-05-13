import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: posts, error } = await supabase
      .from("ForumPost")
      .select(`
        forum_id,
        brand_id,
        title,
        content,
        created_at,
        is_reported,
        report_reason,
        Users (
          name
        )
      `)
      .eq("is_reported", true)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ posts }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}