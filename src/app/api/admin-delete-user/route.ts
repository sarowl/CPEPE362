import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { isAdminEmail } from "@/lib/adminAccounts";

const BUCKET = "Autobot_Storage";

async function listAllFiles(
  supabase: ReturnType<typeof createAdminClient>,
  prefix: string
): Promise<string[]> {
  const { data: items, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error || !items) return [];

  const paths: string[] = [];
  for (const item of items) {
    if (item.id === null) {
      // It's a folder — recurse
      const nested = await listAllFiles(supabase, `${prefix}/${item.name}`);
      paths.push(...nested);
    } else {
      paths.push(`${prefix}/${item.name}`);
    }
  }
  return paths;
}

/** Delete all files under Guides/{user_id}/ in storage. */
async function deleteUserGuidesFolder(
  supabase: ReturnType<typeof createAdminClient>,
  user_id: string
): Promise<{ deleted: number; errors: string[] }> {
  const folderPrefix = `Guides/${user_id}`;
  const allFiles = await listAllFiles(supabase, folderPrefix);

  if (allFiles.length === 0) return { deleted: 0, errors: [] };

  const errors: string[] = [];
  const BATCH = 50;
  let deleted = 0;

  for (let i = 0; i < allFiles.length; i += BATCH) {
    const batch = allFiles.slice(i, i + BATCH);
    const { error } = await supabase.storage.from(BUCKET).remove(batch);
    if (error) {
      errors.push(error.message);
    } else {
      deleted += batch.length;
    }
  }

  return { deleted, errors };
}

export async function DELETE(req: Request) {
  try {
    const adminEmail = req.headers.get("x-admin-email") ?? "";
    if (!adminEmail || !isAdminEmail(adminEmail))
      return NextResponse.json({ error: "Forbidden — admin only." }, { status: 403 });

    const body = await req.json();
    const user_id: string = body?.user_id ?? "";
    const confirm_name: string = body?.confirm_name ?? "";

    if (!user_id)
      return NextResponse.json({ error: "user_id is required." }, { status: 400 });

    if (!confirm_name)
      return NextResponse.json({ error: "confirm_name is required for safety." }, { status: 400 });

    const supabase = createAdminClient();

    // 0. Verify the user exists and the confirm_name matches
    const { data: userRow, error: fetchErr } = await supabase
      .from("Users")
      .select("user_id, name")
      .eq("user_id", user_id)
      .single();

    if (fetchErr || !userRow)
      return NextResponse.json({ error: "User not found." }, { status: 404 });

    if ((userRow.name ?? "").trim().toLowerCase() !== confirm_name.trim().toLowerCase())
      return NextResponse.json(
        { error: "Confirmation name does not match. Deletion cancelled." },
        { status: 400 }
      );

    // 1. Delete all related records first (cascade cleanup)
    const cleanupTables = [
      "Experiences",
      "Certification",
      "Guides",
      "guide_likes",
      "guide_history",
      "guide_reactions",
      "bookmarks",
      "forum_posts",
      "forum_comments",
      "forum_votes",
    ];

    for (const table of cleanupTables) {
      const { error } = await supabase.from(table).delete().eq("user_id", user_id);
      if (error) {
        // Table may not exist or have no records - continue with next table
        console.warn(`Warning: Could not clean up ${table} for user ${user_id}:`, error.message);
      }
    }

    // 2. Delete from Users table
    const { error: dbErr } = await supabase
      .from("Users")
      .delete()
      .eq("user_id", user_id);

    if (dbErr)
      return NextResponse.json({ error: dbErr.message }, { status: 500 });

    // 3. Delete the user's Guides storage folder: Autobot_Storage/Guides/{user_id}/
    const storageResult = await deleteUserGuidesFolder(supabase, user_id);
    if (storageResult.errors.length > 0) {
      console.warn("Storage cleanup warnings for user", user_id, storageResult.errors);
    }

    // 4. Delete from Supabase Auth (only possible with service role key)
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (svcKey) {
      const { createClient } = await import("@supabase/supabase-js");
      const authAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        svcKey,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { error: authErr } = await authAdmin.auth.admin.deleteUser(user_id);
      if (authErr) {
        // Auth delete failed but DB row is already gone — log and continue
        console.warn("Auth user delete warning:", authErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      storage: { filesDeleted: storageResult.deleted },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
