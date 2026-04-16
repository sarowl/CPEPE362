import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();

    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get("brandId");

    let query = supabase
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
      .order("created_at", { ascending: false });

    if (brandId) {
      query = query.eq("brand_id", brandId);
    }

    const { data: posts, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch likes/dislikes for all forum posts
    const forumIds = posts.map((p) => p.forum_id);
    let votesByPost: Record<string, { likes: number; dislikes: number }> = {};
    if (forumIds.length > 0) {
      const { data: votes, error: votesError } = await supabase
        .from("ForumVote")
        .select("target_id, vote")
        .in("target_id", forumIds)
        .eq("target_type", "post");
      if (!votesError && votes) {
        forumIds.forEach((id) => {
          const v = votes.filter((x) => x.target_id === id);
          votesByPost[id] = {
            likes: v.filter((x) => x.vote === 1).length,
            dislikes: v.filter((x) => x.vote === -1).length,
          };
        });
      }
    }

    // Attach likes/dislikes to each post
    const postsWithVotes = posts.map((p) => ({
      ...p,
      likes: votesByPost[p.forum_id]?.likes || 0,
      dislikes: votesByPost[p.forum_id]?.dislikes || 0,
    }));

    return NextResponse.json({ posts: postsWithVotes }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}