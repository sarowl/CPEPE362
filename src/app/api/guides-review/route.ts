import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminAccounts";

// ── POST — approve or reject ──────────────────────────────────
export async function POST(req: Request) {
  try {
    const supabase    = await createClient();
    const adminEmail  = req.headers.get("x-admin-email") ?? "";
    if (!adminEmail || !isAdminEmail(adminEmail))
      return NextResponse.json({ error: "Forbidden — admin only." }, { status: 403 });

    const { guide_id, action, reason, note } = await req.json() as {
      guide_id: string; action: "approve"|"reject"; reason?: string; note?: string;
    };
    if (!guide_id || !action)
      return NextResponse.json({ error: "guide_id and action required." }, { status: 400 });

    const { data: guide } = await supabase
      .from("guides").select("status").eq("guide_id", guide_id).single();
    if (!guide)
      return NextResponse.json({ error: "Guide not found." }, { status: 404 });
    if (guide.status !== "pending")
      return NextResponse.json({ error: "Guide is not pending." }, { status: 400 });

    const now = new Date().toISOString();

    if (action === "approve") {
      const { error } = await supabase.from("guides")
        .update({ status: "approved", reviewed_at: now, reviewed_by: adminEmail })
        .eq("guide_id", guide_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, status: "approved" });
    }

    if (action === "reject") {
      if (!reason)
        return NextResponse.json({ error: "Rejection reason required." }, { status: 400 });
      await supabase.from("guides")
        .update({ status: "rejected", reviewed_at: now, reviewed_by: adminEmail })
        .eq("guide_id", guide_id);
      await supabase.from("guide_rejections")
        .insert([{ guide_id, reason, note: note ?? null, rejected_by: adminEmail }]);
      return NextResponse.json({ success: true, status: "rejected" });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── GET — all pending guides grouped by user ──────────────────
// FIX: Removed broken FK join. Now uses two separate queries.
export async function GET(req: Request) {
  try {
    const adminEmail = req.headers.get("x-admin-email") ?? "";
    if (!adminEmail || !isAdminEmail(adminEmail))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const supabase = await createClient();

    // Query 1: all pending guides — plain select, no join
    const { data: pending, error } = await supabase
      .from("guides")
      .select("guide_id, title, summary, brand_id, model_name, difficulty, time_required, submitted_at, user_id")
      .eq("status", "pending")
      .order("submitted_at", { ascending: true });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    if (!pending || pending.length === 0)
      return NextResponse.json({ groups: [] });

    // Query 2: fetch user names for all unique user_ids
    const uniqueUserIds = [...new Set(pending.map((g: any) => g.user_id as string))];
    const { data: usersData } = await supabase
      .from("Users")
      .select("user_id, name")
      .in("user_id", uniqueUserIds);

    const nameMap: Record<string, string> = {};
    (usersData ?? []).forEach((u: any) => { nameMap[u.user_id] = u.name ?? "Unknown"; });

    // Group guides by user_id
    const byUser: Record<string, { user_id: string; user_name: string; guides: any[] }> = {};
    pending.forEach((g: any) => {
      if (!byUser[g.user_id]) {
        byUser[g.user_id] = {
          user_id:   g.user_id,
          user_name: nameMap[g.user_id] ?? "Unknown",
          guides:    [],
        };
      }
      byUser[g.user_id].guides.push(g);
    });

    return NextResponse.json({ groups: Object.values(byUser) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}