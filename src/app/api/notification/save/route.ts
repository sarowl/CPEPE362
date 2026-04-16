// ============================================================
// api/notification/save/route.ts — IMPORTED FROM Folder_B
//
// POST endpoint: saves a new notification for the authenticated user.
// Deduplicates: if an identical title+message already exists for the
// user, it skips insertion and returns the existing record.
// Used by: Mygarage component when maintenance is saved/updated,
//          triggering a maintenance-reminder notification.
// Body: { title: string, message: string }
// ============================================================
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
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
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";

    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required" },
        { status: 400 }
      );
    }

    // [FROM B] Deduplication check: avoid saving the same notification twice
    const { data: existing, error: existingError } = await supabase
      .from("notification")
      .select("id")
      .eq("user_id", user.id)
      .eq("title", title)
      .eq("message", message)
      .limit(1)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { error: "Failed to verify existing notification" },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { message: "Notification already exists", data: existing },
        { status: 200 }
      );
    }

    // [FROM B] Insert new notification with is_read defaulting to false
    const { data, error } = await supabase
      .from("notification")
      .insert([{ user_id: user.id, title, message, is_read: false }])
      .select();

    if (error) {
      return NextResponse.json(
        { error: "Failed to save notification" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Notification saved", data },
      { status: 201 }
    );

  } catch (err) {
    console.error("POST notification error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
