import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const model_id = searchParams.get("model_id");
    if (!model_id) return NextResponse.json({ error: "model_id required." }, { status: 400 });

    const supabase = await createClient();

    // Fetch all approved guides including tools and required_parts
    const { data: guides, error } = await supabase
      .from("guides")
      .select(
        "guide_id, title, summary, difficulty, time_required, brand_id, model_name, user_id, created_at, thumbnail_url, tools, required_parts"
      )
      .eq("model_id", model_id)
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const list = guides ?? [];
    if (list.length === 0) return NextResponse.json({ guides: [] });

    const guideIds = list.map((g) => g.guide_id);

    // Step counts — single query, count rows per guide_id
    const { data: steps } = await supabase
      .from("guide_steps")
      .select("guide_id")
      .in("guide_id", guideIds);

    const stepCounts: Record<string, number> = {};
    for (const s of steps ?? []) {
      stepCounts[s.guide_id] = (stepCounts[s.guide_id] ?? 0) + 1;
    }

    // Like / dislike counts — single query across all guides
    const { data: reactions } = await supabase
      .from("guide_likes")
      .select("guide_id, reaction")
      .in("guide_id", guideIds);

    const likeCounts:    Record<string, number> = {};
    const dislikeCounts: Record<string, number> = {};
    for (const r of reactions ?? []) {
      if (r.reaction === "like")    likeCounts[r.guide_id]    = (likeCounts[r.guide_id]    ?? 0) + 1;
      if (r.reaction === "dislike") dislikeCounts[r.guide_id] = (dislikeCounts[r.guide_id] ?? 0) + 1;
    }

    // Merge everything into each guide object
    const enriched = list.map((g) => ({
      ...g,
      step_count:    stepCounts[g.guide_id]    ?? 0,
      like_count:    likeCounts[g.guide_id]    ?? 0,
      dislike_count: dislikeCounts[g.guide_id] ?? 0,
    }));

    return NextResponse.json({ guides: enriched });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
