// ================================================================
// PURPOSE:
//   GET    /api/guides/[guideId]  → full guide + steps (owner or approved)
//   PATCH  /api/guides/[guideId]  → update guide intro/details (draft or rejected only)
//   DELETE /api/guides/[guideId]  → delete guide (owner, not pending)
// ================================================================

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

type Params = { params: Promise<{ guideId: string }> };

// ── GET ───────────────────────────────────────────────────────
export async function GET(_req: Request, { params }: Params) {
  try {
    const { guideId } = await params;
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();

    const { data: guide, error } = await supabase
      .from("guides")
      .select("*")
      .eq("guide_id", guideId)
      .single();

    if (error || !guide) return NextResponse.json({ error: "Guide not found." }, { status: 404 });

    // Only owner or approved guides are readable
    if (guide.status !== "approved" && guide.user_id !== authData.user?.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: steps } = await supabase
      .from("guide_steps")
      .select("*")
      .eq("guide_id", guideId)
      .order("step_number");

    // If rejected, also fetch the rejection reason
    let rejection = null;
    if (guide.status === "rejected") {
      const { data: rej } = await supabase
        .from("guide_rejections")
        .select("reason, note, rejected_at")
        .eq("guide_id", guideId)
        .order("rejected_at", { ascending: false })
        .limit(1)
        .single();
      rejection = rej;
    }

    return NextResponse.json({ guide, steps: steps ?? [], rejection });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PATCH — update guide header fields ───────────────────────
export async function PATCH(req: Request, { params }: Params) {
  try {
    const { guideId } = await params;
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify ownership
    const { data: existing } = await supabase
      .from("guides").select("user_id, status").eq("guide_id", guideId).single();
    if (!existing || existing.user_id !== authData.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (existing.status === "pending") return NextResponse.json({ error: "Cannot edit a pending guide." }, { status: 400 });

    const body = await req.json();
    const allowedFields = ["title","summary","introduction","difficulty","time_required","tools","brand_id","model_id","model_name"];
    const updates: Record<string, unknown> = {};
    allowedFields.forEach((f) => { if (f in body) updates[f] = body[f]; });

    // If user is re-editing an approved guide, reset it to draft so it re-enters review
    if (existing.status === "approved") updates.status = "draft";

    const { data, error } = await supabase
      .from("guides").update(updates).eq("guide_id", guideId).select("guide_id, status").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ guide: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── DELETE ───────────────────────────────────────────────────
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { guideId } = await params;
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: existing } = await supabase
      .from("guides").select("user_id, status").eq("guide_id", guideId).single();
    if (!existing || existing.user_id !== authData.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (existing.status === "pending") return NextResponse.json({ error: "Cannot delete a guide pending review." }, { status: 400 });

    const { error } = await supabase.from("guides").delete().eq("guide_id", guideId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}