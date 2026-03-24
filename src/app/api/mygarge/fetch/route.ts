import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json({ message: "No auth token" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ message: "Invalid user" }, { status: 401 });
    }

  
    const { data, error } = await supabase
      .from("User_cars")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      console.error(error);
      return NextResponse.json({ message: "Fetch failed" }, { status: 500 });
    }

    return NextResponse.json({ vehicles: data });

  } catch (err) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}