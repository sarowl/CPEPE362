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

    // Check if the user has already voted on this target
    const { data: existingVote, error: fetchError } = await supabase
      .from("ForumVote")
      .select()
      .eq("user_id", authData.user.id)
      .eq("target_id", target_id)
      .eq("target_type", target_type)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // If the user already voted with the same value, remove the vote
    if (existingVote && existingVote.vote === vote) {
      const { error: deleteError } = await supabase
        .from("ForumVote")
        .delete()
        .eq("vote_id", existingVote.vote_id);

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }

      return NextResponse.json({ message: "Vote removed" }, { status: 200 });
    }

    // If the user already voted with a different value, update the vote
    if (existingVote && existingVote.vote !== vote) {
      const { data: updatedVote, error: updateError } = await supabase
        .from("ForumVote")
        .update({ vote })
        .eq("vote_id", existingVote.vote_id)
        .select()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({ vote: updatedVote }, { status: 200 });
    }

    // No existing vote, insert a new one
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
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ vote: newVote }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}