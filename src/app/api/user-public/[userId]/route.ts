// ================================================================
// FILE: src/app/api/user-public/[userId]/route.ts
//
// GET /api/user-public/[userId]
//
// Returns a public-safe view of any user:
//  - About section (name, about, occupation, profile pic)
//  - Approved guides only
//  - Total likes and dislikes across all their approved guides
//
// Anyone (logged in or not) can view this.
// ================================================================

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

type Params = { params: Promise<{ userId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId } = await params;
    if (!userId)
      return NextResponse.json({ error: "userId required." }, { status: 400 });

    const supabase = createAdminClient();

    // Fetch user profile
    const { data: user, error: userErr } = await supabase
      .from("Users")
      .select("user_id, name, about, occupation, Profilepic, created_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 });
    if (!user)   return NextResponse.json({ error: "User not found." }, { status: 404 });

    // Fetch approved guides for this user
    const { data: guides, error: guidesErr } = await supabase
      .from("guides")
      .select("guide_id, title, summary, brand_id, model_id, model_name, difficulty, time_required, created_at")
      .eq("user_id", userId)
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (guidesErr) return NextResponse.json({ error: guidesErr.message }, { status: 500 });

    const approvedGuides = guides ?? [];

    // Fetch like/dislike counts across all approved guides
    let totalLikes    = 0;
    let totalDislikes = 0;

    if (approvedGuides.length > 0) {
      const guideIds = approvedGuides.map((g: any) => g.guide_id);
      const { data: likesData } = await supabase
        .from("guide_likes")
        .select("guide_id, reaction")
        .in("guide_id", guideIds);

      totalLikes    = (likesData ?? []).filter((r: any) => r.reaction === "like").length;
      totalDislikes = (likesData ?? []).filter((r: any) => r.reaction === "dislike").length;
    }

    return NextResponse.json({
      user: {
        user_id:     user.user_id,
        name:        user.name,
        about:       user.about,
        occupation:  user.occupation,
        profile_pic: user.Profilepic,
        created_at:  user.created_at,
      },
      approvedGuides,
      totalLikes,
      totalDislikes,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
