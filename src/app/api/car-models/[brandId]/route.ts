import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server.js";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const supabase = await createClient();
  const { brandId } = await params;

  const { data: models, error } = await supabase
    .from("car_models")
    .select("id, name, slug, category, years, model_img, info")
    .eq("brand_id", brandId)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!models || models.length === 0) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  return NextResponse.json({ models });
}