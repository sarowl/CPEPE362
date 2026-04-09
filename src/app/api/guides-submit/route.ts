// ================================================================
// PURPOSE:
//   POST /api/guides-submit  → user submits a draft/rejected guide for review
//                              sets status = "pending", records submitted_at
// ================================================================

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { guide_id } = await req.json();
    if (!guide_id) return NextResponse.json({ error: "guide_id required." }, { status: 400 });

    // Verify ownership
    const { data: guide } = await supabase
      .from("guides").select("user_id, status, title").eq("guide_id", guide_id).single();
    if (!guide || guide.user_id !== authData.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (guide.status === "pending") return NextResponse.json({ error: "Already pending." }, { status: 400 });
    if (guide.status === "approved") {
      // Re-submitting an approved guide resets it to draft first, then pending
    }

    // Ensure there is at least one step before submitting
    const { data: steps } = await supabase
      .from("guide_steps").select("step_id").eq("guide_id", guide_id).limit(1);
    if (!steps || steps.length === 0) {
      return NextResponse.json({ error: "Add at least one step before submitting." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("guides")
      .update({ status: "pending", submitted_at: new Date().toISOString() })
      .eq("guide_id", guide_id)
      .select("guide_id, status")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ guide: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}