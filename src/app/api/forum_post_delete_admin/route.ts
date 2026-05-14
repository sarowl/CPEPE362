import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function DELETE(req: Request) {
  try {
    const { forum_id, deletion_reason } = await req.json();
    if (!forum_id) {
      return NextResponse.json({ error: "Missing forum_id" }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch post before deleting to get owner and title
    const { data: post, error: fetchError } = await supabase
      .from("ForumPost")
      .select("user_id, title")
      .eq("forum_id", forum_id)
      .single();

    if (fetchError || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Delete the post
    const { error: deleteError } = await supabase
      .from("ForumPost")
      .delete()
      .eq("forum_id", forum_id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Send notification to post owner
    const notifMessage = deletion_reason
      ? `Your post "${post.title}" was removed by a moderator. Reason: ${deletion_reason}`
      : `Your post "${post.title}" was removed by a moderator.`;

    await supabase
      .from("notification")
      .insert({
        user_id: post.user_id,
        title: "Post Removed",
        message: notifMessage,
        is_read: false,
      });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}