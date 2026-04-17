// ============================================================
//
// PATCH endpoint: marks a list of notification IDs as read for the
// authenticated user. Called automatically 300ms after the notification
// panel opens in the Navbar, so the unread badge clears on view.
// Body: { ids: string[] }
// ============================================================
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
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

    const body = await req.json();
    const notificationIds = body.ids ?? [];

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json(
        { error: "ids array is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("notification")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .in("id", notificationIds);

    if (error) {
      console.error("Mark read error:", error);
      return NextResponse.json(
        { error: "Failed to mark notifications as read" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Notifications marked as read" },
      { status: 200 }
    );
  } catch (err) {
    console.error("PATCH notification mark-read error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

