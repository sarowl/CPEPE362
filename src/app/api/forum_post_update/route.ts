import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const { forum_id, title, content, model_id, car_model } = await req.json();

    if (!forum_id || !title || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Build update payload — only include model fields if they were explicitly provided
    const updatePayload: Record<string, unknown> = {
      title,
      content,
      updated_at: new Date().toISOString(),
    };

    if (model_id !== undefined) updatePayload.model_id = model_id || null;
    if (car_model !== undefined) updatePayload.car_model = car_model || null;

    const { data: post, error } = await supabase
      .from("ForumPost")
      .update(updatePayload)
      .eq("forum_id", forum_id)
      .eq("user_id", authData.user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!post) {
      return NextResponse.json({ error: "Post not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ post }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
