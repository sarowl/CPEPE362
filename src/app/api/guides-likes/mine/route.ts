// ================================================================
// GET /api/guides-likes/mine
//
// Returns all guides the current authenticated user has liked.
// Private — requires auth cookie. Used by the "Liked Guides" tab
// in the user's own profile (Req #10).
//
// Other users' profiles (/user/[userId]) do NOT expose this data.
// ================================================================

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = authData.user.id;
    const adminClient = createAdminClient();

    // Fetch all guide_ids this user has liked
    const { data: likeRows, error: likesError } = await adminClient
      .from("guide_likes")
      .select("guide_id")
      .eq("user_id", userId)
      .eq("reaction", "like");

    if (likesError)
      return NextResponse.json({ error: likesError.message }, { status: 500 });

    const guideIds = (likeRows ?? []).map((r: any) => r.guide_id);

    if (guideIds.length === 0)
      return NextResponse.json({ guides: [] });

    // Fetch only approved guides (in case a guide was later rejected/deleted)
    const { data: guides, error: guidesError } = await adminClient
      .from("guides")
      .select("guide_id, title, summary, brand_id, model_id, model_name, difficulty, time_required, created_at")
      .in("guide_id", guideIds)
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (guidesError)
      return NextResponse.json({ error: guidesError.message }, { status: 500 });

    return NextResponse.json({ guides: guides ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
