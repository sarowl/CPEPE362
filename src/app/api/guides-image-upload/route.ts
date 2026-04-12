// ================================================================
// PURPOSE: Upload a step image to Autobot_Storage/Guides/{user_id}/{guide_id}/
//   POST  multipart/form-data  { file, guide_id }
//   Returns the public URL of the uploaded image.
//
// Storage path: Guides/{user_id}/{guide_id}/{timestamp}_{filename}
// ================================================================

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const BUCKET = "Autobot_Storage";
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB per image
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file     = formData.get("file") as File | null;
    const guide_id = formData.get("guide_id") as string | null;

    if (!file)     return NextResponse.json({ error: "No file provided." },    { status: 400 });
    if (!guide_id) return NextResponse.json({ error: "guide_id required." },   { status: 400 });
    if (file.size > MAX_SIZE_BYTES)       return NextResponse.json({ error: "File exceeds 5 MB limit." }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "Invalid file type. Use JPEG, PNG, WebP, or GIF." }, { status: 400 });

    // Verify the guide belongs to this user
    const { data: guide } = await supabase
      .from("guides").select("user_id").eq("guide_id", guide_id).single();
    if (!guide || guide.user_id !== authData.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build storage path: Guides/{user_id}/{guide_id}/{timestamp}_{sanitised_name}
    const ext       = file.name.split(".").pop() ?? "jpg";
    const safeName  = `${Date.now()}.${ext}`;
    const storagePath = `Guides/${authData.user.id}/${guide_id}/${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer      = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);

    return NextResponse.json({ url: urlData.publicUrl, path: storagePath }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}