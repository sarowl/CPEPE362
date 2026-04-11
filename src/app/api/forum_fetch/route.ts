import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();

    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get("brandId");

    if (!brandId) {
      return NextResponse.json({ error: "Missing brandId" }, { status: 400 });
    }

    const { data: posts, error } = await supabase
      .from("ForumPost")
      .select(`
        forum_id,
        brand_id,
        title,
        content,
        created_at,
        updated_at,
        user_id,
        Users (
          name
        )
      `)
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ posts }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}