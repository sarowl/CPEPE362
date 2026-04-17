import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId      = authData.user.id;
    const adminClient = createAdminClient();

    const { data: bookmarkRows, error: bkError } = await adminClient
      .from("guide_reactions")
      .select("guide_id")
      .eq("user_id", userId);

    if (bkError)
      return NextResponse.json({ error: bkError.message }, { status: 500 });

    const guideIds = (bookmarkRows ?? []).map((r: any) => r.guide_id);

    if (guideIds.length === 0)
      return NextResponse.json({ guides: [] });

    // UPDATED: include thumbnail_url for card display
    const { data: guides, error: guidesError } = await adminClient
      .from("guides")
      .select("guide_id, title, summary, brand_id, model_id, model_name, difficulty, time_required, created_at, thumbnail_url")
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
