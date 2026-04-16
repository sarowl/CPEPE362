import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { isAdminEmail } from "@/lib/adminAccounts";

// ── GET — reviewed guides (approved + rejected), excluding hidden
export async function GET(req: Request) {
  try {
    const adminEmail = req.headers.get("x-admin-email") ?? "";
    if (!adminEmail || !isAdminEmail(adminEmail))
      return NextResponse.json({ error: "Forbidden — admin only." }, { status: 403 });

    const supabase = createAdminClient();

    // Get all guides that have been reviewed (approved or rejected)
    const { data: guides, error } = await supabase
      .from("guides")
      .select(
        "guide_id, title, summary, brand_id, model_name, model_id, difficulty, time_required, required_parts, status, reviewed_at, reviewed_by, user_id, submitted_at"
      )
      .in("status", ["approved", "rejected"])
      .order("reviewed_at", { ascending: false, nullsFirst: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Get hidden guide ids
    const { data: hiddenRows } = await supabase
      .from("admin_hidden_guides")
      .select("guide_id");

    const hiddenSet = new Set((hiddenRows ?? []).map((r: any) => r.guide_id));

    // Filter out hidden guides
    const visible = (guides ?? []).filter((g: any) => !hiddenSet.has(g.guide_id));

    // Fetch user names
    const uniqueUserIds = [...new Set(visible.map((g: any) => g.user_id as string))];
    const { data: usersData } = await supabase
      .from("Users")
      .select("user_id, name")
      .in("user_id", uniqueUserIds);

    const nameMap: Record<string, string> = {};
    (usersData ?? []).forEach((u: any) => { nameMap[u.user_id] = u.name ?? "Unknown"; });

    // Attach rejection reason for rejected guides
    const rejectedGuideIds = visible
      .filter((g: any) => g.status === "rejected")
      .map((g: any) => g.guide_id);

    const { data: rejections } = rejectedGuideIds.length > 0
      ? await supabase
          .from("guide_rejections")
          .select("guide_id, reason, note, rejected_at")
          .in("guide_id", rejectedGuideIds)
          .order("rejected_at", { ascending: false })
      : { data: [] };

    const rejMap: Record<string, any> = {};
    (rejections ?? []).forEach((r: any) => {
      if (!rejMap[r.guide_id]) rejMap[r.guide_id] = r; // keep latest
    });

    const enriched = visible.map((g: any) => ({
      ...g,
      user_name:      nameMap[g.user_id] ?? "Unknown",
      rejection:      rejMap[g.guide_id] ?? null,
    }));

    return NextResponse.json({ guides: enriched, total: enriched.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── DELETE — soft-delete from admin history only ──────────────
export async function DELETE(req: Request) {
  try {
    const adminEmail = req.headers.get("x-admin-email") ?? "";
    if (!adminEmail || !isAdminEmail(adminEmail))
      return NextResponse.json({ error: "Forbidden — admin only." }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const guide_id = searchParams.get("guide_id");
    if (!guide_id)
      return NextResponse.json({ error: "guide_id required." }, { status: 400 });

    const supabase = createAdminClient();

    // Insert into the hidden table (upsert to avoid duplicate error)
    const { error } = await supabase
      .from("admin_hidden_guides")
      .upsert({ guide_id, hidden_by: adminEmail }, { onConflict: "guide_id" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, guide_id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
