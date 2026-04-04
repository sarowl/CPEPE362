// ================================================================
// PURPOSE: GET /api/guides/by-model?model_id=xxx
//          Returns all approved guides for a given car model.
// ================================================================

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const model_id = searchParams.get("model_id");
    if (!model_id) return NextResponse.json({ error: "model_id required." }, { status: 400 });

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("guides")
      .select("guide_id, title, summary, difficulty, time_required, brand_id, model_name, user_id, created_at")
      .eq("model_id", model_id)
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ guides: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}