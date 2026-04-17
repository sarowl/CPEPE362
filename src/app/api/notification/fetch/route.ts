// ============================================================
//
// GET endpoint: fetches all notifications for the authenticated user.
// Requires Bearer token in Authorization header (Supabase JWT).
// Used by: Navbar notification bell (polls every 30s + on panel open).
// Returns: { notifications: Array<{id, user_id, title, message, is_read, created_at}> }
// ============================================================
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Missing authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("notification")
      .select("id, user_id, title, message, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch notifications" },
        { status: 500 }
      );
    }

    return NextResponse.json({ notifications: data }, { status: 200 });

  } catch (err) {
    console.error("GET notifications error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

