// ================================================================
// Storage Auto-Sync — Car Models
//
// POST /api/car-models-storage-sync
//
// On admin login or when accessing the Admin page:
//   1. Fetch all records from car_models table
//   2. Check existing folders in Car_Models/{car_model_id}/
//   3. For each car_model_id:
//      - If folder EXISTS → do nothing
//      - If folder DOES NOT EXIST → automatically create it
//
// A folder is "created" by uploading a tiny .keep placeholder file,
// since Supabase Storage has no explicit mkdir — folders are implicit
// path prefixes that only exist when they contain at least one file.
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

    if (!models || models.length === 0) {
      return NextResponse.json({ synced: 0, created: [], skipped: [] });
    }

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

    // Build a Set of existing folder names for O(1) lookup
    const existingNames = new Set(
      (existingFolders ?? []).map((item) => item.name)
    );

    const created: string[] = [];
    const skipped: string[] = [];

    // 3. For each model, create folder if it doesn't exist
    for (const model of models) {
      const modelId = model.id as string;

      if (existingNames.has(modelId)) {
        // Folder already exists — check it has at least one real file
        // (not just the .keep placeholder); if only .keep exists that's fine
        skipped.push(modelId);
        continue;
      }

      // Folder does NOT exist — create it by uploading a .keep placeholder
      const keepPath = `Car_Models/${modelId}/.keep`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(keepPath, KEEP_CONTENT, {
          contentType: "application/octet-stream",
          upsert: false, // don't overwrite if somehow it already exists
        });

      if (uploadError && !uploadError.message.includes("already exists")) {
        // Log but don't fail the entire sync for one folder
        console.error(`Failed to create folder for model ${modelId}:`, uploadError.message);
      } else {
        created.push(modelId);
        existingNames.add(modelId); // prevent duplicate creation in same run
      }
    }

    return NextResponse.json({
      synced: models.length,
      created,
      skipped,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
