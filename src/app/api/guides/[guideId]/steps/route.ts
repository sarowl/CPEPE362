// ================================================================
// PURPOSE:
//   GET   → list all steps for a guide
//   POST  → add a new step
//   PUT   → replace all steps (full save)
// ================================================================

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

type Params = { params: Promise<{ guideId: string }> };

async function assertOwner(supabase: any, guideId: string, userId: string) {
  const { data } = await supabase
    .from("guides").select("user_id, status").eq("guide_id", guideId).single();
  if (!data || data.user_id !== userId) return null;
  return data;
}

export async function GET(_req: Request, { params }: Params) {
  const { guideId } = await params;
  const supabase = await createClient();
  const { data: steps, error } = await supabase
    .from("guide_steps").select("*").eq("guide_id", guideId).order("step_number");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ steps: steps ?? [] });
}

// ── PUT — replace all steps for a guide ──────────────────────
export async function PUT(req: Request, { params }: Params) {
  try {
    const { guideId } = await params;
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const guide = await assertOwner(supabase, guideId, authData.user.id);
    if (!guide) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (guide.status === "pending") return NextResponse.json({ error: "Cannot edit a pending guide." }, { status: 400 });

    const body = await req.json();
    const { steps } = body as { steps: { step_number: number; title: string; instructions: string; images: string[]; video_url?: string }[] };

    if (!Array.isArray(steps)) return NextResponse.json({ error: "steps must be an array." }, { status: 400 });

    // Delete existing steps then re-insert (simplest consistent replace)
    await supabase.from("guide_steps").delete().eq("guide_id", guideId);

    if (steps.length > 0) {
      const rows = steps.map((s) => ({
        guide_id: guideId,
        step_number: s.step_number,
        title: s.title ?? "",
        instructions: s.instructions ?? "",
        images: s.images ?? [],
        video_url: s.video_url ?? null,
      }));
      const { error } = await supabase.from("guide_steps").insert(rows);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: steps.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}