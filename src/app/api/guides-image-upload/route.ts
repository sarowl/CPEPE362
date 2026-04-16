import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const BUCKET = "Autobot_Storage";
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData      = await req.formData();
    const file          = formData.get("file") as File | null;
    const guide_id      = formData.get("guide_id") as string | null;
    const isThumbnail   = formData.get("is_thumbnail") === "true";
    const stepNumberRaw = formData.get("step_number") as string | null;
    const stepNumber    = stepNumberRaw ? parseInt(stepNumberRaw, 10) : null;

    if (!file)     return NextResponse.json({ error: "No file provided." },   { status: 400 });
    if (!guide_id) return NextResponse.json({ error: "guide_id required." }, { status: 400 });
    if (file.size > MAX_SIZE_BYTES)         return NextResponse.json({ error: "File exceeds 5 MB limit." }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "Invalid file type." }, { status: 400 });

    // Verify guide belongs to this user
    const { data: guide } = await supabase
      .from("guides").select("user_id").eq("guide_id", guide_id).single();
    if (!guide || guide.user_id !== authData.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId  = authData.user.id;
    const ext      = file.name.split(".").pop() ?? "jpg";
    const safeName = `${Date.now()}.${ext}`;

    // SECTION 7: Determine storage path based on type
    let storagePath: string;
    if (isThumbnail) {
      // SECTION 6: Thumbnail goes to thumbnail/ subfolder
      storagePath = `Guides/${userId}/${guide_id}/thumbnail/${safeName}`;
    } else if (stepNumber !== null && !isNaN(stepNumber)) {
      // SECTION 7: Step images go to step_{N}/ subfolder
      const { data: existing } = await supabase.storage
        .from(BUCKET)
        .list(`Guides/${userId}/${guide_id}/step_${stepNumber}`);
      const imageCount = (existing ?? []).filter((f) => f.name !== ".keep").length;
      if (imageCount >= 3) {
        return NextResponse.json({ error: "Maximum 3 images per step." }, { status: 400 });
      }
      storagePath = `Guides/${userId}/${guide_id}/step_${stepNumber}/${safeName}`;
    } else {
      // Backward-compatible flat path for old guides
      storagePath = `Guides/${userId}/${guide_id}/${safeName}`;
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer      = Buffer.from(arrayBuffer);

    // For thumbnails: delete any existing thumbnail files before uploading the new one
    // This ensures stale cached files don't interfere with the new public URL
    if (isThumbnail) {
      const thumbFolder = `Guides/${userId}/${guide_id}/thumbnail`;
      const { data: existingFiles } = await supabase.storage
        .from(BUCKET)
        .list(thumbFolder);
      if (existingFiles && existingFiles.length > 0) {
        const toRemove = existingFiles
          .filter((f) => f.name !== ".keep")
          .map((f) => `${thumbFolder}/${f.name}`);
        if (toRemove.length > 0) {
          await supabase.storage.from(BUCKET).remove(toRemove);
        }
      }
    }

    // Use upsert: true for thumbnails so re-uploading the same filename doesn't fail
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: file.type, upsert: isThumbnail });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Build the public URL using the Supabase project URL directly to ensure
    // it always resolves correctly regardless of client-side env config
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
    const publicUrl   = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${storagePath}`;

    // SECTION 6: Auto-update thumbnail_url in DB when uploading thumbnail
    // Append a cache-busting timestamp so browsers always load the latest image
    const finalUrl = isThumbnail ? `${publicUrl}?t=${Date.now()}` : publicUrl;
    if (isThumbnail) {
      await supabase
        .from("guides")
        .update({ thumbnail_url: finalUrl })
        .eq("guide_id", guide_id);
    }

    return NextResponse.json({ url: finalUrl, path: storagePath }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
