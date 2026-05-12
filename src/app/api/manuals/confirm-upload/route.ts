// src/app/api/manuals/confirm-upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/adminAccounts";

export async function POST(req: NextRequest) {
  try {
    // Step 1: Authenticate as admin
    const adminEmail = req.headers.get("x-admin-email") ?? "";
    if (!adminEmail || !isAdminEmail(adminEmail)) {
      return NextResponse.json(
        { error: "Forbidden — admin only." },
        { status: 403 }
      );
    }

    // Step 2: Validate service role key
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!svcKey) {
      return NextResponse.json(
        { error: "Service role key not configured." },
        { status: 500 }
      );
    }

    // Step 3: Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const { fileKey, fileName, brandId, modelId } = body;

    if (!fileKey || !fileName || !brandId || !modelId) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: fileKey, fileName, brandId, modelId.",
        },
        { status: 400 }
      );
    }

    // Step 4: Create Supabase admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      svcKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Step 5: Insert manual metadata into database
    const { data: manual, error: insertError } = await supabaseAdmin
      .from("manuals")
      .insert([
        {
          file_key: fileKey,
          file_name: fileName,
          brand_id: brandId,
          model_id: modelId,
          created_at: new Date().toISOString(),
          uploaded_by: adminEmail,
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save manual metadata." },
        { status: 500 }
      );
    }

    // Step 6: Return success response with manual ID
    return NextResponse.json(
      {
        success: true,
        manualId: manual.id,
        message: "Manual metadata saved successfully.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Confirm upload error:", error);
    return NextResponse.json(
      { error: "Failed to confirm upload." },
      { status: 500 }
    );
  }
}
