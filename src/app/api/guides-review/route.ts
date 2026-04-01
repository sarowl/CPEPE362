import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { isAdminEmail } from "@/lib/adminAccounts";

// ── POST — approve or reject ──────────────────────────────────
export async function POST(req: Request) {
  try {
    const adminEmail = req.headers.get("x-admin-email") ?? "";
    if (!adminEmail || !isAdminEmail(adminEmail))
      return NextResponse.json({ error: "Forbidden — admin only." }, { status: 403 });

    const { guide_id, action, reason, note } = (await req.json()) as {
      guide_id: string;
      action: "approve" | "reject";
      reason?: string;
      note?: string;
    };

    if (!guide_id || !action)
      return NextResponse.json({ error: "guide_id and action required." }, { status: 400 });

    // Use admin client to bypass RLS — fixes "new row violates row-level
    // security policy for table guides" (Admin Fix #1)
    const supabase = createAdminClient();

    // Fetch guide — need user_id + title for the notification
    const { data: guide, error: fetchErr } = await supabase
      .from("guides")
      .select("status, user_id, title")
      .eq("guide_id", guide_id)
      .maybeSingle();

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    if (!guide)   return NextResponse.json({ error: "Guide not found." }, { status: 404 });

    // Only pending guides are reviewable
    if (guide.status !== "pending")
      return NextResponse.json(
        { error: `Guide status is "${guide.status}" — only pending guides can be reviewed.` },
        { status: 400 }
      );

    const now = new Date().toISOString();

    if (action === "approve") {
      const { error } = await supabase
        .from("guides")
        .update({ status: "approved", reviewed_at: now, reviewed_by: adminEmail })
        .eq("guide_id", guide_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Notify author — admin client so RLS doesn't block the INSERT
      await supabase.from("user_notifications").insert([
        {
          user_id:     guide.user_id,
          type:        "guide_approved",
          guide_id,
          guide_title: guide.title,
          message:     `Your guide "${guide.title}" has been approved and is now published!`,
          reason:      null,
          note:        null,
        },
      ]);

      return NextResponse.json({ success: true, status: "approved" });
    }

    if (action === "reject") {
      if (!reason)
        return NextResponse.json({ error: "Rejection reason required." }, { status: 400 });

      await supabase
        .from("guides")
        .update({ status: "rejected", reviewed_at: now, reviewed_by: adminEmail })
        .eq("guide_id", guide_id);

      await supabase
        .from("guide_rejections")
        .insert([{ guide_id, reason, note: note ?? null, rejected_by: adminEmail, rejected_at: now }]);

      // Notify author
      await supabase.from("user_notifications").insert([
        {
          user_id:     guide.user_id,
          type:        "guide_rejected",
          guide_id,
          guide_title: guide.title,
          message:     `Your guide "${guide.title}" has been rejected.`,
          reason,
          note:        note ?? null,
        },
      ]);

      return NextResponse.json({ success: true, status: "rejected" });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── GET — pending-only guides grouped by user ─────────────────
// FIX (Admin #2): Only returns guides with status = 'pending'.
// Approved / rejected guides are excluded so they no longer appear
// in the review queue after the admin acts on them.
export async function GET(req: Request) {
  try {
    const adminEmail = req.headers.get("x-admin-email") ?? "";
    if (!adminEmail || !isAdminEmail(adminEmail))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const supabase = createAdminClient();

    // Strict pending-only filter (Admin Fix #2)
    const { data: pending, error } = await supabase
      .from("guides")
      .select(
        "guide_id, title, summary, brand_id, model_name, difficulty, time_required, submitted_at, user_id, status"
      )
      .eq("status", "pending")
      .order("submitted_at", { ascending: true, nullsFirst: false });

    if (error) {
      console.error("guides-review GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!pending || pending.length === 0)
      return NextResponse.json({ groups: [], pendingCount: 0 });

    // Fetch user names
    const uniqueUserIds = [...new Set(pending.map((g: any) => g.user_id as string))];
    const { data: usersData, error: usersError } = await supabase
      .from("Users")
      .select("user_id, name")
      .in("user_id", uniqueUserIds);

    if (usersError) console.error("users fetch error:", usersError.message);

    const nameMap: Record<string, string> = {};
    (usersData ?? []).forEach((u: any) => { nameMap[u.user_id] = u.name ?? "Unknown"; });

    // Group by user
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

    return NextResponse.json({
      groups:       Object.values(byUser),
      pendingCount: pending.length,
    });
  } catch (err: any) {
    console.error("guides-review GET exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}