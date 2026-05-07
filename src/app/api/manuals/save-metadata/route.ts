import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/adminAccounts";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate the Admin
    const adminEmail = req.headers.get("x-admin-email") ?? "";
    if (!isAdminEmail(adminEmail)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse the incoming JSON metadata
    const body = await req.json();
    const { brandId, modelId, manualType, title, fileKey, fileName, fileSize } = body;

    // 3. Validate that all required fields are present
    if (!brandId || !modelId || !manualType || !title || !fileKey) {
      return NextResponse.json({ 
        error: "Missing required metadata fields." 
      }, { status: 400 });
    }

    // 4. Save the metadata to the Supabase database
    const { data: manual, error: dbErr } = await createAdminClient()
      .from("manuals")
      .insert({
        brand_id: brandId,
        model_id: modelId,
        manual_type: manualType,
        title: title.trim(),
        file_key: fileKey,
        file_name: fileName,
        file_size: fileSize,
      })
      .select()
      .single();

    if (dbErr) {
      console.error("Supabase insert error:", dbErr);
      return NextResponse.json({ error: dbErr.message }, { status: 500 });
    }

    // 5. Return success!
    return NextResponse.json({ manual }, { status: 201 });

  } catch (error: any) {
    console.error("Save metadata error:", error);
    return NextResponse.json({ 
      error: "An unexpected error occurred saving metadata." 
    }, { status: 500 });
  }
}