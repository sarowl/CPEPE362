// ================================================================
// FILE: src/app/api/guides/route.ts
//
// UPDATED (Spec 2 - Section 6):
// - GET now includes `thumbnail_url` in all guide select queries
//   so that guide cards throughout the app can display the actual
//   uploaded thumbnail instead of the fallback image.
// ================================================================

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mine = searchParams.get("mine") === "1";

    const supabase = await createClient();

    if (mine) {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { data: guides, error } = await supabase
        .from("guides")
        .select(`
          guide_id, title, summary, brand_id, model_id, model_name,
          difficulty, time_required, status, thumbnail_url, required_parts,
          created_at, updated_at, submitted_at, reviewed_at
        `)
        .eq("user_id", authData.user.id)
        .order("updated_at", { ascending: false });

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ guides: guides ?? [] });
    }

    // Public: all approved guides — UPDATED to include thumbnail_url
    const brandId = searchParams.get("brandId");
    let query = supabase
      .from("guides")
      .select(`
        guide_id, title, summary, brand_id, model_id, model_name,
        difficulty, time_required, status, user_id, thumbnail_url, required_parts,
        created_at, updated_at
      `)
      .eq("status", "approved");

    if (brandId) {
      query = query.eq("brand_id", brandId);
    }

    const { data: guides, error } = await query.order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ guides: guides ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { brand_id, model_id, model_name, title, summary, introduction, difficulty, time_required, tools, required_parts } = body;

    if (!brand_id || !model_id || !title || !summary || !difficulty || !time_required) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("guides")
      .insert([{
        user_id: authData.user.id,
        brand_id, model_id, model_name,
        title, summary,
        introduction: introduction || "",
        difficulty, time_required,
        tools: tools ?? [],
        required_parts: required_parts ?? [],
        status: "draft",
      }])
      .select("guide_id, title, status")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ guide: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
