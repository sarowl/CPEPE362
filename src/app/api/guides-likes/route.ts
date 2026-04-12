import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// ── GET — fetch counts + current user's reaction + bookmark ──
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const guide_id = searchParams.get("guide_id");
    if (!guide_id)
      return NextResponse.json({ error: "guide_id required." }, { status: 400 });

    const adminClient = createAdminClient();

    // Reaction counts from guide_likes (like / dislike — pure reactions)
    const { data: allReactions, error } = await adminClient
      .from("guide_likes")
      .select("user_id, reaction")
      .eq("guide_id", guide_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const likes    = (allReactions ?? []).filter((r: any) => r.reaction === "like").length;
    const dislikes = (allReactions ?? []).filter((r: any) => r.reaction === "dislike").length;

    let myReaction: string | null = null;
    let myUserId:   string | null = null;
    let bookmarked: boolean       = false;

    try {
      const supabase = await createClient();
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        myUserId   = authData.user.id;
        const mine = (allReactions ?? []).find((r: any) => r.user_id === authData.user!.id);
        myReaction = mine?.reaction ?? null;

        // Check bookmark status from guide_reactions table
        const { data: bk } = await adminClient
          .from("guide_reactions")
          .select("id")
          .eq("guide_id", guide_id)
          .eq("user_id", myUserId)
          .maybeSingle();
        bookmarked = !!bk;
      }
    } catch (_) { /* unauthenticated */ }

    return NextResponse.json({ likes, dislikes, myReaction, myUserId, bookmarked });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST — upsert/remove reaction OR toggle bookmark ─────────
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = authData.user.id;
    const body   = await req.json() as {
      guide_id: string;
      reaction?: "like" | "dislike" | null;
      action?: "bookmark";
    };
    const { guide_id, reaction, action } = body;

    if (!guide_id)
      return NextResponse.json({ error: "guide_id required." }, { status: 400 });

    const adminClient = createAdminClient();

    // ── Bookmark toggle ────────────────────────────────────────
    if (action === "bookmark") {
      const { data: existing } = await adminClient
        .from("guide_reactions")
        .select("id")
        .eq("guide_id", guide_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        // Remove bookmark
        await adminClient
          .from("guide_reactions")
          .delete()
          .eq("guide_id", guide_id)
          .eq("user_id", userId);
        return NextResponse.json({ success: true, bookmarked: false });
      } else {
        // Add bookmark
        const { error: insertErr } = await adminClient
          .from("guide_reactions")
          .upsert(
            { guide_id, user_id: userId, reaction: "like" },
            { onConflict: "guide_id,user_id" }
          );
        if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
        return NextResponse.json({ success: true, bookmarked: true });
      }
    }

    // ── Reaction (like / dislike) — guide_likes table ─────────
    // Prevent reacting to own guide
    const { data: guide } = await supabase
      .from("guides")
      .select("user_id")
      .eq("guide_id", guide_id)
      .maybeSingle();

    if (guide?.user_id === userId)
      return NextResponse.json({ error: "Cannot react to your own guide." }, { status: 400 });

    if (reaction === null) {
      await supabase
        .from("guide_likes")
        .delete()
        .eq("guide_id", guide_id)
        .eq("user_id", userId);
    } else {
      const { error: upsertErr } = await supabase
        .from("guide_likes")
        .upsert(
          { guide_id, user_id: userId, reaction },
          { onConflict: "guide_id,user_id" }
        );
      if (upsertErr) {
        const { error: adminErr } = await adminClient
          .from("guide_likes")
          .upsert(
            { guide_id, user_id: userId, reaction },
            { onConflict: "guide_id,user_id" }
          );
        if (adminErr) return NextResponse.json({ error: adminErr.message }, { status: 500 });
      }
    }

    const { data: allReactions } = await adminClient
      .from("guide_likes")
      .select("reaction")
      .eq("guide_id", guide_id);

    const likes    = (allReactions ?? []).filter((r: any) => r.reaction === "like").length;
    const dislikes = (allReactions ?? []).filter((r: any) => r.reaction === "dislike").length;

    return NextResponse.json({ success: true, likes, dislikes, myReaction: reaction });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
