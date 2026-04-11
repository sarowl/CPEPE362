// ================================================================
// UPDATED (Spec 3):
// - Storage path changed to Car_Models/{brand_id}/{model_id}/image.<ext>
//   (uses model UUID id, not slug)
// - upsert:true ensures re-uploads overwrite existing images
// - Returns public URL stored in car_models.model_img
// ================================================================

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { isAdminEmail } from "@/lib/adminAccounts";

const BUCKET = "Autobot_Storage";

export async function POST(req: Request) {
  try {
    const adminEmail = req.headers.get("x-admin-email") ?? "";
    if (!adminEmail || !isAdminEmail(adminEmail)) {
      return NextResponse.json({ error: "Forbidden — admin only." }, { status: 403 });
    }

    const formData = await req.formData();
    const file     = formData.get("file")     as File   | null;
    const brand_id = (formData.get("brand_id") as string | null)?.trim().toLowerCase();
    const model_id = (formData.get("model_id") as string | null)?.trim();

    if (!file || !brand_id || !model_id) {
      return NextResponse.json(
        { error: "file, brand_id, and model_id are required." },
        { status: 400 }
      );
    }

    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();

    // Storage path: Car_Models/<brand_id>/<model_id>/image.<ext>
    // Using model UUID (id) as specified in Spec 3.1
    const storagePath = `Car_Models/${brand_id}/${model_id}/image.${ext}`;

    const supabase = createAdminClient();

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, arrayBuffer, {
        contentType: file.type || "image/jpeg",
        upsert: true, // overwrite if file already exists (replace existing)
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get the public URL
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    const publicUrl = urlData.publicUrl;

    // Update car_models.model_img with public URL
    const { error: updateError } = await supabase
      .from("car_models")
      .update({ model_img: publicUrl })
      .eq("id", model_id);

    if (updateError) {
      return NextResponse.json(
        { error: `DB update failed: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: publicUrl, path: storagePath }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
