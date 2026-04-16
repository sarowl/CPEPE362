import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get("brandId") || null;
    const modelId = searchParams.get("modelId") || null;
    const query   = searchParams.get("q") || null;

    let dbQuery = supabase
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
        ),
        ForumComment (
          comment_id
        )
      `)
      .order("created_at", { ascending: false });

    if (brandId) {
      dbQuery = dbQuery.eq("brand_id", brandId);
    }

    if (modelId) {
      dbQuery = dbQuery.eq("model_id", modelId);
    }

    const { data: posts, error } = await dbQuery;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let modelMap: Record<string, string> = {};
    const modelIds = Array.from(new Set((posts || []).map((p: any) => p.model_id).filter(Boolean)));
    if (modelIds.length > 0) {
      const { data: models, error: modelError } = await supabase
        .from("car_models")
        .select("id, name")
        .in("id", modelIds);

      if (!modelError && models) {
        modelMap = models.reduce((acc: Record<string, string>, model: any) => {
          if (model.id) acc[model.id] = model.name;
          return acc;
        }, {});
      }
    }

    // Fetch vote counts for all posts
    const postIds = (posts || []).map((p: any) => p.forum_id);
    let votesMap: Record<string, { likes: number; dislikes: number }> = {};

    if (postIds.length > 0) {
      const { data: votes } = await supabase
        .from("ForumVote")
        .select("target_id, vote")
        .in("target_id", postIds)
        .eq("target_type", "post");

      postIds.forEach((id: string) => {
        const pv = (votes || []).filter((v: any) => v.target_id === id);
        votesMap[id] = {
          likes: pv.filter((v: any) => v.vote === 1).length,
          dislikes: pv.filter((v: any) => v.vote === -1).length,
        };
      });
    }

    // Merge votes and comment counts into posts
    const enriched = (posts || []).map((p: any) => ({
      ...p,
      model_name: p.model_id ? modelMap[p.model_id] ?? null : null,
      likes: votesMap[p.forum_id]?.likes ?? 0,
      dislikes: votesMap[p.forum_id]?.dislikes ?? 0,
      comment_count: Array.isArray(p.ForumComment) ? p.ForumComment.length : 0,
    }));

    // Apply search filter if query provided
    let filtered = enriched;
    if (query && query.trim()) {
      const keywords = query.toLowerCase().split(/\s+/).filter(Boolean);
      filtered = enriched.filter((p: any) => {
        const haystack = `${p.title} ${p.content} ${p.brand_id} ${p.model_name ?? p.model_id ?? ""} ${p.Users?.name ?? ""}`.toLowerCase();
        return keywords.every((k: string) => haystack.includes(k));
      });
    }

    return NextResponse.json({ posts: filtered }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
