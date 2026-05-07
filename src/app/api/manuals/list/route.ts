import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";


export async function GET(req: NextRequest) {
  const brandId  = req.nextUrl.searchParams.get("brand_id");
  const modelId  = req.nextUrl.searchParams.get("model_id");

  let query = createAdminClient()
    .from("manuals")
    .select("id, title, brand_id, model_id, manual_type, file_name, file_size, created_at, car_models(name)")
    .order("created_at", { ascending: false });

  if (brandId) query = query.eq("brand_id", brandId);
  if (modelId) query = query.eq("model_id", modelId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ manuals: data ?? [] });
}