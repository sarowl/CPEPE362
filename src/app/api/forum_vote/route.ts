import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const { target_id, target_type, vote } = await req.json();

    if (!target_id || !target_type || vote === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["post", "comment"].includes(target_type)) {
      return NextResponse.json({ error: "Invalid target_type" }, { status: 400 });
    }

    if (![1, -1].includes(vote)) {
      return NextResponse.json({ error: "Invalid vote value" }, { status: 400 });
    }

    // Prevent post authors from voting on their own posts
    if (target_type === "post") {
      const { data: postOwner, error: postError } = await supabase
        .from("ForumPost")
        .select("user_id")
        .eq("forum_id", target_id)
        .single();

      if (postError && postError.code !== "PGRST116") {
        return NextResponse.json({ error: postError.message }, { status: 500 });
      }

      if (postOwner?.user_id === authData.user.id) {
        return NextResponse.json({ error: "Cannot react to your own post" }, { status: 403 });
      }
    }

    // Fetch ALL existing votes from this user on this target to guard against duplicates
    const { data: existingVotes, error: fetchError } = await supabase
      .from("ForumVote")
      .select("vote_id, vote")
      .eq("user_id", authData.user.id)
      .eq("target_id", target_id)
      .eq("target_type", target_type);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Clean up any duplicate votes (defensive: keep only the first, delete the rest)
    if (existingVotes && existingVotes.length > 1) {
      const [, ...duplicates] = existingVotes;
      const duplicateIds = duplicates.map((v) => v.vote_id);
      await supabase.from("ForumVote").delete().in("vote_id", duplicateIds);
    }

    const existingVote = existingVotes && existingVotes.length > 0 ? existingVotes[0] : null;

    // If the user already voted with the same value → toggle off (remove)
    if (existingVote && existingVote.vote === vote) {
      const { error: deleteError } = await supabase
        .from("ForumVote")
        .delete()
        .eq("vote_id", existingVote.vote_id);

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }

      return NextResponse.json({ message: "Vote removed", action: "removed" }, { status: 200 });
    }

    // If the user already voted with a different value → update (not insert)
    if (existingVote && existingVote.vote !== vote) {
      const { data: updatedVote, error: updateError } = await supabase
        .from("ForumVote")
        .update({ vote })
        .eq("vote_id", existingVote.vote_id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({ vote: updatedVote, action: "updated" }, { status: 200 });
    }

    // No existing vote → insert new one
    const { data: newVote, error: insertError } = await supabase
      .from("ForumVote")
      .insert({
        user_id: authData.user.id,
        target_id,
        target_type,
        vote,
      })
      .select()
      .single();

    if (insertError) {
      // Handle unique constraint violation gracefully (race condition guard)
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "Vote already exists" }, { status: 409 });
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ vote: newVote, action: "inserted" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}