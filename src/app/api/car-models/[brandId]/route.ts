import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const { brandId } = await params;
  const supabase = await createClient();

  console.log("Querying brand_id:", JSON.stringify(brandId));

  const { data: models, error } = await supabase
    .from("car_models")
    .select("id, name, slug, category, years, model_img, info")
    .eq("brand_id", brandId)
    .order("name");

  console.log("Error:", error);
  console.log("Models count:", models?.length);
  console.log("First model:", models?.[0]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ models: models ?? [] });
}