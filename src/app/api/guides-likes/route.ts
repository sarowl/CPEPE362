// ================================================================
// FIX (V2 Req #6): Like/Dislike system was not persisting.
//
// ROOT CAUSE: The POST handler used adminClient (service-role /
// anon key) for the upsert, but the guide_likes RLS policy checks
// auth.uid() = user_id. The adminClient has no user session so
// auth.uid() returns NULL → RLS blocks the INSERT.
//
// FIX: Use the SSR supabase client (carries the user's cookie
// session) for the upsert/delete so auth.uid() resolves correctly.
// The adminClient is still used for the count query (no RLS concern
// on SELECT with public_select policy).
//
// GET  ?guide_id=xxx  → counts + current user reaction
// POST { guide_id, reaction: 'like'|'dislike'|null }  → upsert/remove
// ================================================================

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// ── GET — fetch like/dislike counts + current user's reaction ─
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const guide_id = searchParams.get("guide_id");
    if (!guide_id)
      return NextResponse.json({ error: "guide_id required." }, { status: 400 });

    const adminClient = createAdminClient();

    const { data: allReactions, error } = await adminClient
      .from("guide_likes")
      .select("user_id, reaction")
      .eq("guide_id", guide_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const likes    = (allReactions ?? []).filter((r: any) => r.reaction === "like").length;
    const dislikes = (allReactions ?? []).filter((r: any) => r.reaction === "dislike").length;

    // Identify current user (optional — unauthenticated requests get null)
    let myReaction: string | null = null;
    let myUserId:   string | null = null;
    try {
      const supabase = await createClient();
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        myUserId = authData.user.id;
        const mine = (allReactions ?? []).find((r: any) => r.user_id === authData.user!.id);
        myReaction = mine?.reaction ?? null;
      }
    } catch (_) { /* unauthenticated — ignore */ }

    return NextResponse.json({ likes, dislikes, myReaction, myUserId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST — upsert or remove a reaction ────────────────────────
export async function POST(req: Request) {
  try {
    // Use SSR client so auth.uid() is set in RLS policies
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = authData.user.id;
    const { guide_id, reaction } = (await req.json()) as {
      guide_id: string;
      reaction: "like" | "dislike" | null;
    };

    if (!guide_id)
      return NextResponse.json({ error: "guide_id required." }, { status: 400 });

    // Prevent reacting to own guide
    const { data: guide } = await supabase
      .from("guides")
      .select("user_id")
      .eq("guide_id", guide_id)
      .maybeSingle();

    if (guide?.user_id === userId)
      return NextResponse.json({ error: "Cannot react to your own guide." }, { status: 400 });

    // FIX: use the SSR supabase client (with user session) so RLS
    // auth.uid() check passes. adminClient has no session → auth.uid()=null
    if (reaction === null) {
      const { error: delErr } = await supabase
        .from("guide_likes")
        .delete()
        .eq("guide_id", guide_id)
        .eq("user_id", userId);
      if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    } else {
      // Try upsert with SSR client first; fall back to adminClient if RLS
      // is set to TO authenticated (service-role bypasses anyway)
      const { error: upsertErr } = await supabase
        .from("guide_likes")
        .upsert(
          { guide_id, user_id: userId, reaction },
          { onConflict: "guide_id,user_id" }
        );
      if (upsertErr) {
        // Fallback: service-role client (only works if SUPABASE_SERVICE_ROLE_KEY set)
        const adminClient = createAdminClient();
        const { error: adminErr } = await adminClient
          .from("guide_likes")
          .upsert(
            { guide_id, user_id: userId, reaction },
            { onConflict: "guide_id,user_id" }
          );
        if (adminErr) return NextResponse.json({ error: adminErr.message }, { status: 500 });
      }
    }

    // Return fresh counts using adminClient (no RLS concern for SELECT)
    const adminClient = createAdminClient();
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
