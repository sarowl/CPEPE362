import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();

    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json({ error: "Missing postId" }, { status: 400 });
    }

    // Fetch the post
    const { data: post, error: postError } = await supabase
      .from("ForumPost")
      .select(`
        forum_id,
        brand_id,
        model_id,
        title,
        content,
        created_at,
        updated_at,
        user_id,
        Users (
          name
        )
      `)
      .eq("forum_id", postId)
      .single();

    if (postError) {
      return NextResponse.json({ error: postError.message }, { status: 500 });
    }

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    let model_name: string | null = null;
    if (post.model_id) {
      const { data: modelData, error: modelError } = await supabase
        .from("car_models")
        .select("name")
        .eq("id", post.model_id)
        .single();

      if (!modelError && modelData) {
        model_name = modelData.name;
      }
    }

    let myReaction: "like" | "dislike" | null = null;
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (!authError && authData.user) {
      const { data: existingVote, error: voteError } = await supabase
        .from("ForumVote")
        .select("vote")
        .eq("user_id", authData.user.id)
        .eq("target_id", postId)
        .eq("target_type", "post")
        .single();

      if (!voteError && existingVote) {
        myReaction = existingVote.vote === 1 ? "like" : existingVote.vote === -1 ? "dislike" : null;
      }
    }

    const enrichedPost = {
      ...post,
      model_name,
    };

    // Fetch comments
    const { data: comments, error: commentsError } = await supabase
      .from("ForumComment")
      .select(`
        comment_id,
        post_id,
        user_id,
        content,
        created_at,
        updated_at,
        Users (
          name
        )
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (commentsError) {
      return NextResponse.json({ error: commentsError.message }, { status: 500 });
    }

    // Fetch votes for the post
    const { data: postVotesData, error: postVotesError } = await supabase
      .from("ForumVote")
      .select("vote")
      .eq("target_id", postId)
      .eq("target_type", "post");

    if (postVotesError) {
      return NextResponse.json({ error: postVotesError.message }, { status: 500 });
    }

    const postVotes = {
      likes: postVotesData?.filter((v) => v.vote === 1).length || 0,
      dislikes: postVotesData?.filter((v) => v.vote === -1).length || 0,
    };

    // Fetch votes for all comments
    const commentIds = (comments || []).map((c) => c.comment_id);
    const commentVotes: Record<string, { likes: number; dislikes: number }> = {};

    if (commentIds.length > 0) {
      const { data: commentVotesData, error: commentVotesError } = await supabase
        .from("ForumVote")
        .select("target_id, vote")
        .in("target_id", commentIds)
        .eq("target_type", "comment");

      if (commentVotesError) {
        return NextResponse.json({ error: commentVotesError.message }, { status: 500 });
      }

      commentIds.forEach((id) => {
        const votes = commentVotesData?.filter((v) => v.target_id === id) || [];
        commentVotes[id] = {
          likes: votes.filter((v) => v.vote === 1).length,
          dislikes: votes.filter((v) => v.vote === -1).length,
        };
      });
    }

    return NextResponse.json({ post: enrichedPost, comments, postVotes, commentVotes, myReaction }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}