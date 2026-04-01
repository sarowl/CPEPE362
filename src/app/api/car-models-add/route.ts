// ================================================================
// CHANGES: Now accepts optional `info` field alongside name/category/years.
//          Image upload is handled separately by /api/car-models-image-upload
//          after this route creates the row and returns the model_id + slug.
// ================================================================

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { brand_id, name, category, years, info } = body as {
      brand_id: string;
      name: string;
      category: string;
      years: string;
      info?: string | null;
    };

    if (!brand_id || !name || !category || !years) {
      return NextResponse.json(
        { error: "brand_id, name, category, and years are required." },
        { status: 400 }
      );
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("car_models")
      .insert([{ brand_id, name, slug, category, years, info: info ?? null }])
      .select("id, name, slug, category, years, info, model_img, brand_id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: `A model named "${name}" already exists for this brand.` },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ model: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}