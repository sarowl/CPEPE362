import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { isAdminEmail } from "@/lib/adminAccounts";

export async function POST(req: Request) {
  try {
    const adminEmail = req.headers.get("x-admin-email") ?? "";
    if (!adminEmail || !isAdminEmail(adminEmail))
      return NextResponse.json({ error: "Forbidden — admin only." }, { status: 403 });

    const supabase = createAdminClient();

    // 1. Fetch all forum posts that have a car_model (text) recorded
    const { data: posts, error: postsErr } = await supabase
      .from("ForumPost")
      .select("forum_id, car_model, model_id, brand_id");

    if (postsErr)
      return NextResponse.json({ error: postsErr.message }, { status: 500 });

    if (!posts || posts.length === 0)
      return NextResponse.json({ checked: 0, fixed: 0, skipped: 0, unmatched: 0, unmatched_entries: [] });

    // 2. Fetch all car models (id, name, brand_id)
    const { data: carModels, error: modelsErr } = await supabase
      .from("car_models")
      .select("id, name, brand_id");

    if (modelsErr)
      return NextResponse.json({ error: modelsErr.message }, { status: 500 });

    // Build a lookup map: "brand_id|name_lowercase" → model id
    const modelMap = new Map<string, string>();
    for (const m of carModels ?? []) {
      const key = `${m.brand_id}|${m.name.trim().toLowerCase()}`;
      modelMap.set(key, m.id);
    }

    let fixed = 0;
    let skipped = 0;
    let unmatched = 0;
    const unmatchedEntries: { forum_id: string; car_model: string | null }[] = [];

    for (const post of posts) {
      // Skip posts with no car_model text — nothing to re-align
      if (!post.car_model) {
        skipped++;
        continue;
      }

      const key = `${post.brand_id}|${post.car_model.trim().toLowerCase()}`;
      const correctId = modelMap.get(key);

      if (!correctId) {
        // No matching car model found — skip to avoid data loss
        unmatched++;
        unmatchedEntries.push({ forum_id: post.forum_id, car_model: post.car_model });
        continue;
      }

      // Already correct — idempotent skip
      if (post.model_id === correctId) {
        skipped++;
        continue;
      }

      // Update the model_id to the correct current ID
      const { error: updateErr } = await supabase
        .from("ForumPost")
        .update({ model_id: correctId })
        .eq("forum_id", post.forum_id);

      if (updateErr) {
        // Log but don't abort — continue with remaining posts
        unmatchedEntries.push({ forum_id: post.forum_id, car_model: `UPDATE ERROR: ${updateErr.message}` });
        unmatched++;
      } else {
        fixed++;
      }
    }

    return NextResponse.json({
      checked: posts.length,
      fixed,
      skipped,
      unmatched,
      unmatched_entries: unmatchedEntries,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
