// ================================================================
// Storage Auto-Sync — Car Models
//
// Admin-only endpoint (x-admin-email header required).
// ================================================================

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { isAdminEmail } from "@/lib/adminAccounts";

const BUCKET = "Autobot_Storage";
const KEEP_CONTENT = new Uint8Array(0); // zero-byte placeholder

export async function POST(req: Request) {
  try {
    const adminEmail = req.headers.get("x-admin-email") ?? "";
    if (!adminEmail || !isAdminEmail(adminEmail)) {
      return NextResponse.json({ error: "Forbidden — admin only." }, { status: 403 });
    }

    const supabase = createAdminClient();

    // 1. Fetch all car model IDs from the database
    const { data: models, error: dbError } = await supabase
      .from("car_models")
      .select("id");

    if (dbError) {
      return NextResponse.json(
        { error: `Failed to fetch car_models: ${dbError.message}` },
        { status: 500 }
      );
    }

    const dbModelIds = new Set<string>((models ?? []).map((m) => m.id as string));

    // 2. List all existing top-level folders under Car_Models/
    const { data: existingFolders, error: listError } = await supabase.storage
      .from(BUCKET)
      .list("Car_Models");

    if (listError) {
      return NextResponse.json(
        { error: `Failed to list storage folders: ${listError.message}` },
        { status: 500 }
      );
    }

    const storageFolders = existingFolders ?? [];
    const storageFolderNames = new Set(storageFolders.map((item) => item.name));

    const created: string[] = [];
    const skipped: string[] = [];
    const deleted: string[] = [];

    // 3. For each DB model, create storage folder if missing
    for (const modelId of dbModelIds) {
      if (storageFolderNames.has(modelId)) {
        skipped.push(modelId);
        continue;
      }

      // Folder does NOT exist — create it via .keep placeholder
      const keepPath = `Car_Models/${modelId}/.keep`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(keepPath, KEEP_CONTENT, {
          contentType: "application/octet-stream",
          upsert: false,
        });

      if (uploadError && !uploadError.message.includes("already exists")) {
        console.error(`Failed to create folder for model ${modelId}:`, uploadError.message);
      } else {
        created.push(modelId);
      }
    }

    // 4. For each storage folder, delete it if no matching DB record exists (orphan)
    for (const folder of storageFolders) {
      const folderId = folder.name;
      if (dbModelIds.has(folderId)) continue; // valid — matches a DB record

      // Orphan folder — list its contents and delete them all
      const { data: objects } = await supabase.storage
        .from(BUCKET)
        .list(`Car_Models/${folderId}`);

      if (objects && objects.length > 0) {
        const paths = objects.map((o) => `Car_Models/${folderId}/${o.name}`);
        await supabase.storage.from(BUCKET).remove(paths);
      } else {
        // Empty folder token itself (edge case) — attempt removal
        await supabase.storage.from(BUCKET).remove([`Car_Models/${folderId}/`]);
      }

      deleted.push(folderId);
    }

    return NextResponse.json({
      synced: dbModelIds.size,
      created,
      skipped,
      deleted,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
