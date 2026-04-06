// ================================================================
// PURPOSE: CRUD operations for the guides table
//   GET  /api/guides          → returns all guides owned by the current user
//   POST /api/guides          → creates a new draft guide (no steps yet)
// ================================================================

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// ── GET — fetch current user's guides ────────────────────────
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: guides, error } = await supabase
      .from("guides")
      .select(`
        guide_id, title, summary, brand_id, model_name,
        difficulty, time_required, status,
        created_at, updated_at, submitted_at, reviewed_at
      `)
      .eq("user_id", authData.user.id)
      .order("updated_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ guides: guides ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST — create a new draft guide ──────────────────────────
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { brand_id, model_id, model_name, title, summary, introduction, difficulty, time_required, tools } = body;

    if (!brand_id || !model_id || !title || !summary || !introduction || !difficulty || !time_required) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("guides")
      .insert([{
        user_id: authData.user.id,
        brand_id, model_id, model_name,
        title, summary, introduction,
        difficulty, time_required,
        tools: tools ?? [],
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