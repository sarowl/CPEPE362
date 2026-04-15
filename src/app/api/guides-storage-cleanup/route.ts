import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const BUCKET = "Autobot_Storage";

/**
 * Spec 6: Storage Structure Enforcement & Cleanup
 *
 * POST /api/guides-storage-cleanup
 * Body: { guide_id: string }
 *
 * For the given guide, enforces:
 *   Guides/{user_id}/{guide_id}/thumbnail/  → max 1 image
 *   Guides/{user_id}/{guide_id}/step_N/     → max 3 images each
 *
 * Deletes any files that are NOT inside thumbnail/ or step_N/ folders.
 * Deletes excess images beyond the max (keeps newest by name sort).
 * Only operates on the specific guide — never touches other guides.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { guide_id } = body;
    if (!guide_id) return NextResponse.json({ error: "guide_id required" }, { status: 400 });

    // Verify guide belongs to caller
    const { data: guide } = await supabase
      .from("guides")
      .select("user_id, guide_steps(step_number)")
      .eq("guide_id", guide_id)
      .single();

    if (!guide) return NextResponse.json({ error: "Guide not found" }, { status: 404 });
    if (guide.user_id !== authData.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = guide.user_id;
    const guideRoot = `Guides/${userId}/${guide_id}`;

    // List all items directly under the guide root
    const { data: rootItems } = await supabase.storage.from(BUCKET).list(guideRoot);
    if (!rootItems || rootItems.length === 0) {
      return NextResponse.json({ cleaned: true, deleted: [] });
    }

    const toDelete: string[] = [];
    const validFolderPattern = /^(thumbnail|step_\d+)$/;

    // Separate folders from loose files
    for (const item of rootItems) {
      if (item.id === null) {
        // It's a folder
        if (!validFolderPattern.test(item.name)) {
          // Invalid folder — list and delete all its contents
          const { data: folderContents } = await supabase.storage
            .from(BUCKET)
            .list(`${guideRoot}/${item.name}`);
          if (folderContents) {
            for (const f of folderContents) {
              toDelete.push(`${guideRoot}/${item.name}/${f.name}`);
            }
          }
        }
      } else {
        // Loose file directly under guide root — not in any valid subfolder → delete
        toDelete.push(`${guideRoot}/${item.name}`);
      }
    }

    // Enforce max 1 thumbnail
    const { data: thumbFiles } = await supabase.storage
      .from(BUCKET)
      .list(`${guideRoot}/thumbnail`);
    if (thumbFiles && thumbFiles.length > 1) {
      // Keep the last one (sorted by name desc), delete the rest
      const sorted = thumbFiles
        .filter((f) => f.name !== ".keep")
        .sort((a, b) => b.name.localeCompare(a.name));
      for (const f of sorted.slice(1)) {
        toDelete.push(`${guideRoot}/thumbnail/${f.name}`);
      }
    }

    // Enforce max 3 images per step
    const stepNumbers: number[] = (guide.guide_steps ?? []).map((s: any) => s.step_number);
    for (const stepNum of stepNumbers) {
      const { data: stepFiles } = await supabase.storage
        .from(BUCKET)
        .list(`${guideRoot}/step_${stepNum}`);
      if (stepFiles && stepFiles.length > 3) {
        const sorted = stepFiles
          .filter((f) => f.name !== ".keep")
          .sort((a, b) => b.name.localeCompare(a.name));
        for (const f of sorted.slice(3)) {
          toDelete.push(`${guideRoot}/step_${stepNum}/${f.name}`);
        }
      }
    }

    // Perform deletions in batches
    if (toDelete.length > 0) {
      const BATCH = 50;
      for (let i = 0; i < toDelete.length; i += BATCH) {
        await supabase.storage.from(BUCKET).remove(toDelete.slice(i, i + BATCH));
      }
    }

    return NextResponse.json({ cleaned: true, deleted: toDelete });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
