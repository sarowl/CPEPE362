import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const userId = authData.user.id;

    const { data: posts, error: postsError } = await supabase
      .from("ForumPost")
      .select(`
        forum_id,
        title,
        brand_id,
        created_at
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (postsError) {
      return NextResponse.json({ error: postsError.message }, { status: 500 });
    }

    const { data: comments, error: commentsError } = await supabase
      .from("ForumComment")
      .select(`
        comment_id,
        content,
        created_at,
        post_id,
        ForumPost (
          forum_id,
          title,
          brand_id
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (commentsError) {
      return NextResponse.json({ error: commentsError.message }, { status: 500 });
    }

    return NextResponse.json({ posts, comments }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}