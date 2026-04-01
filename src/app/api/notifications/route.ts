// ===============================================================
// PURPOSE:
//   GET   /api/notifications          → returns the current user's notifications
//                                        (newest first) + unread count
//   PATCH /api/notifications          → marks all notifications as read
//   PATCH /api/notifications?id=<id>  → marks a single notification as read
// ================================================================

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// ── GET ───────────────────────────────────────────────────────
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: notifications, error } = await supabase
      .from("user_notifications")
      .select("id, type, guide_id, guide_title, message, reason, note, read, created_at")
      .eq("user_id", authData.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    const unreadCount = (notifications ?? []).filter((n) => !n.read).length;

    return NextResponse.json({ notifications: notifications ?? [], unreadCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PATCH — mark read ─────────────────────────────────────────
export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const id  = url.searchParams.get("id");

    let query = supabase
      .from("user_notifications")
      .update({ read: true })
      .eq("user_id", authData.user.id);

    if (id) query = query.eq("id", id);

    const { error } = await query;
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}