import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { isAdminEmail } from "@/lib/adminAccounts";

const BUCKET = "Autobot_Storage";
const GUIDES_PREFIX = "Guides";

async function listAllFiles(
  supabase: ReturnType<typeof createAdminClient>,
  prefix: string
): Promise<string[]> {
  const { data: items, error } = await supabase.storage
    .from(BUCKET)
    .list(prefix, { limit: 1000 });

  if (error || !items) return [];

  const paths: string[] = [];
  for (const item of items) {
    if (item.id === null) {
      // Folder — recurse
      const nested = await listAllFiles(supabase, `${prefix}/${item.name}`);
      paths.push(...nested);
    } else {
      paths.push(`${prefix}/${item.name}`);
    }
  }
  return paths;
}

export async function POST(req: Request) {
  try {
    const adminEmail = req.headers.get("x-admin-email") ?? "";
    if (!adminEmail || !isAdminEmail(adminEmail))
      return NextResponse.json({ error: "Forbidden — admin only." }, { status: 403 });

    const supabase = createAdminClient();

    // 1. List all top-level folders under Guides/
    const { data: guideFolders, error: listErr } = await supabase.storage
      .from(BUCKET)
      .list(GUIDES_PREFIX, { limit: 1000 });

    if (listErr)
      return NextResponse.json({ error: listErr.message }, { status: 500 });

    if (!guideFolders || guideFolders.length === 0)
      return NextResponse.json({ orphaned: [], deleted: 0, errors: [] });

    // Only consider folder entries (id === null means folder in Supabase storage)
    const folderIds = guideFolders
      .filter((item) => item.id === null)
      .map((item) => item.name);

    if (folderIds.length === 0)
      return NextResponse.json({ orphaned: [], deleted: 0, errors: [] });

    // 2. Fetch all existing user_ids from the Users table
    const { data: users, error: usersErr } = await supabase
      .from("Users")
      .select("user_id");

    if (usersErr)
      return NextResponse.json({ error: usersErr.message }, { status: 500 });

    const activeUserIds = new Set((users ?? []).map((u: { user_id: string }) => u.user_id));

    // 3. Find orphaned folders (folder name is a user_id not in Users table)
    const orphanedFolders = folderIds.filter((id) => !activeUserIds.has(id));

    if (orphanedFolders.length === 0)
      return NextResponse.json({ orphaned: [], deleted: 0, errors: [] });

    // 4. Delete all files inside each orphaned folder
    const errors: string[] = [];
    let totalDeleted = 0;

    for (const folderId of orphanedFolders) {
      const prefix = `${GUIDES_PREFIX}/${folderId}`;
      const allFiles = await listAllFiles(supabase, prefix);

      if (allFiles.length === 0) continue;

      const BATCH = 50;
      for (let i = 0; i < allFiles.length; i += BATCH) {
        const batch = allFiles.slice(i, i + BATCH);
        const { error: removeErr } = await supabase.storage.from(BUCKET).remove(batch);
        if (removeErr) {
          errors.push(`Folder ${folderId}: ${removeErr.message}`);
        } else {
          totalDeleted += batch.length;
        }
      }
    }

    return NextResponse.json({
      orphaned: orphanedFolders,
      deleted: totalDeleted,
      errors,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
