// ================================================================
// Storage System - Car Model Images
// Storage path: Car_Models/{model_id}/image.<ext>
//   - No brand_id subfolder — path is flat: Car_Models/{model_id}/
//   - Removes any existing image in folder before uploading (1 image only)
//   - upsert:true as safety net
//   - Returns public URL stored in car_models.model_img
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
    const model_id = (formData.get("model_id") as string | null)?.trim();

    if (!file || !model_id) {
      return NextResponse.json(
        { error: "file and model_id are required." },
        { status: 400 }
      );
    }

    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    const supabase = createAdminClient();

    // Enforce 1 image per folder: remove any existing images first
    const folderPath = `Car_Models/${model_id}`;
    const { data: existingFiles } = await supabase.storage
      .from(BUCKET)
      .list(folderPath);

    if (existingFiles && existingFiles.length > 0) {
      const toRemove = existingFiles
        .filter((f) => f.name !== ".keep")
        .map((f) => `${folderPath}/${f.name}`);
      if (toRemove.length > 0) {
        await supabase.storage.from(BUCKET).remove(toRemove);
      }
    }

    // Upload: Car_Models/{model_id}/image.<ext>
    const storagePath = `${folderPath}/image.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, arrayBuffer, {
        contentType: file.type || "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Build public URL
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    const publicUrl = urlData.publicUrl;

    // Update car_models.model_img with the public URL
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
