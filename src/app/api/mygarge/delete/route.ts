import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 🔐 Get auth header
    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { message: "No auth token" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // 🔐 Validate user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { message: "Invalid user" },
        { status: 401 }
      );
    }

    // 📦 Get ID from body
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { message: "Vehicle ID is required" },
        { status: 400 }
      );
    }

   
    const { error } = await supabase
      .from("User_cars") // ✅ SAME as your save route
      .delete()
      .eq("id", id)
      .eq("user_id", user.id); // 🔒 safety: only delete own data

    if (error) {
      console.error("Delete error:", error);
      return NextResponse.json(
        { message: "Delete failed", error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Vehicle deleted successfully",
    });

  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}