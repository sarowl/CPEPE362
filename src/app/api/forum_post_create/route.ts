import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const { brand_id, model_id, car_model, title, content } = await req.json();

    if (!brand_id || !title || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data: post, error } = await supabase
      .from("ForumPost")
      .insert({
        user_id: authData.user.id,
        brand_id,
        model_id: model_id || null,
        car_model: car_model || null,
        title,
        content,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
