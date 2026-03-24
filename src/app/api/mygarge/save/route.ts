import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { model, year, color } = body;

    // ✅ basic validation
    if (!model || !year || !color) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }


    const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { message: "No auth token" },
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
        { message: "Invalid user" },
        { status: 401 }
      );
    }

    // 🔥 INSERT into Supabase
    const { data, error } = await supabase
      .from("User_cars")
      .insert([
        {
          user_id: user.id,
          model,
          year,
          color,
        },
      ]);

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { message: "Insert failed", error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Saved successfully",
      data,
    });

  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}