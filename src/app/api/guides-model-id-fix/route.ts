import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { isAdminEmail } from "@/lib/adminAccounts";

export async function POST(req: Request) {
  try {
    const adminEmail = req.headers.get("x-admin-email") ?? "";
    if (!adminEmail || !isAdminEmail(adminEmail)) {
      return NextResponse.json({ error: "Forbidden — admin only." }, { status: 403 });
    }

    const supabase = createAdminClient();

    // ── 1. Fetch all guides ──────────────────────────────────────
    const { data: guides, error: guidesError } = await supabase
      .from("guides")
      .select("guide_id, brand_id, model_id, model_name");

    if (guidesError) {
      return NextResponse.json(
        { error: `Failed to fetch guides: ${guidesError.message}` },
        { status: 500 }
      );
    }

    // ── 2. Fetch all car_models ──────────────────────────────────
    const { data: carModels, error: modelsError } = await supabase
      .from("car_models")
      .select("id, brand_id, name");

    if (modelsError) {
      return NextResponse.json(
        { error: `Failed to fetch car_models: ${modelsError.message}` },
        { status: 500 }
      );
    }

    // ── 3. Build lookup: "brand_id|model_name" → current UUID ────
    // Keys are lower-cased + trimmed for resilient matching.
    const modelLookup = new Map<string, string>();
    for (const cm of carModels ?? []) {
      const key = `${(cm.brand_id ?? "").trim().toLowerCase()}|${(cm.name ?? "").trim().toLowerCase()}`;
      modelLookup.set(key, cm.id);
    }

    // ── 4 & 5. Compare and patch stale guides ───────────────────
    const fixed: { guide_id: string; old_model_id: string; new_model_id: string }[] = [];
    const skipped: string[] = [];
    const unmatched: { guide_id: string; brand_id: string; model_name: string }[] = [];

    for (const guide of guides ?? []) {
      const key = `${(guide.brand_id ?? "").trim().toLowerCase()}|${(guide.model_name ?? "").trim().toLowerCase()}`;
      const correctId = modelLookup.get(key);

      if (!correctId) {
        // No car_models row found for this brand + model name combo
        unmatched.push({
          guide_id: guide.guide_id,
          brand_id: guide.brand_id,
          model_name: guide.model_name,
        });
        continue;
      }

      if (guide.model_id === correctId) {
        // Already pointing at the right UUID — nothing to do
        skipped.push(guide.guide_id);
        continue;
      }

      // Stale ID — patch it
      const { error: updateError } = await supabase
        .from("guides")
        .update({ model_id: correctId })
        .eq("guide_id", guide.guide_id);

      if (updateError) {
        console.error(
          `Failed to update guide ${guide.guide_id}: ${updateError.message}`
        );
        unmatched.push({
          guide_id: guide.guide_id,
          brand_id: guide.brand_id,
          model_name: guide.model_name,
        });
      } else {
        fixed.push({
          guide_id: guide.guide_id,
          old_model_id: guide.model_id,
          new_model_id: correctId,
        });
      }
    }

    return NextResponse.json({
      checked: (guides ?? []).length,
      fixed: fixed.length,
      skipped: skipped.length,
      unmatched: unmatched.length,
      details: { fixed, unmatched },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
