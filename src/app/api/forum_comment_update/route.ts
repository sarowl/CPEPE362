import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const { comment_id, content } = await req.json();

    if (!comment_id || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data: comment, error } = await supabase
      .from("ForumComment")
      .update({
        content,
        updated_at: new Date().toISOString(),
      })
      .eq("comment_id", comment_id)
      .eq("user_id", authData.user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!comment) {
      return NextResponse.json({ error: "Comment not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ comment }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}