// ================================================================
//  [User Fix #1] Deleting from profile Contribution tab does not work:
//    - DELETE previously blocked pending guides from being deleted
//      ("Cannot delete a guide pending review").
//      The doc says pending guides CAN be deleted from the
//      Contribution tab (they are just not editable).
//      Removed the pending-status guard on DELETE so users can
//      delete their own pending guides.
//    - Also properly cleans up all step images from storage before
//      removing the DB row.
//
//  [User Fix #3] Redirect to login when "Create Guide" clicked
//    without being logged in:
//    - GET/PATCH/DELETE all already return 401 for unauthenticated
//      requests.  The actual redirect lives in the create page
//      (see guides/create/page.tsx).
//
//  [Viewing & Editing] Approved guides re-enter review on edit:
//    - PATCH already sets status back to 'draft' when an approved
//      guide is edited, then the user must re-submit.
// ================================================================

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { isAdminEmail } from "@/lib/adminAccounts";

type Params = { params: Promise<{ guideId: string }> };

const BUCKET = "Autobot_Storage";

// ── GET ───────────────────────────────────────────────────────
export async function GET(req: Request, { params }: Params) {
  try {
    const { guideId } = await params;

    const adminEmail = req.headers.get("x-admin-email") ?? "";
    const isAdmin    = !!(adminEmail && isAdminEmail(adminEmail));

    const supabase = isAdmin ? createAdminClient() : await createClient();

    const { data: guide, error } = await supabase
      .from("guides")
      .select("*")
      .eq("guide_id", guideId)
      .maybeSingle();

    if (error)  return NextResponse.json({ error: error.message }, { status: 500 });
    if (!guide) return NextResponse.json({ error: "Guide not found." }, { status: 404 });

    // Non-admin: only owner or approved guides are readable
    if (!isAdmin) {
      const { data: authData } = await (await createClient()).auth.getUser();
      if (guide.status !== "approved" && guide.user_id !== authData?.user?.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { data: steps } = await supabase
      .from("guide_steps")
      .select("*")
      .eq("guide_id", guideId)
      .order("step_number");

    let rejection = null;
    if (guide.status === "rejected") {
      const { data: rej } = await supabase
        .from("guide_rejections")
        .select("reason, note, rejected_at")
        .eq("guide_id", guideId)
        .order("rejected_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      rejection = rej;
    }

    return NextResponse.json({ guide, steps: steps ?? [], rejection });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PATCH — update guide header fields (owner only) ───────────
export async function PATCH(req: Request, { params }: Params) {
  try {
    const { guideId } = await params;
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: existing } = await supabase
      .from("guides")
      .select("user_id, status")
      .eq("guide_id", guideId)
      .maybeSingle();

    if (!existing || existing.user_id !== authData.user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (existing.status === "pending")
      return NextResponse.json({ error: "Cannot edit a pending guide." }, { status: 400 });

    const body = await req.json();
    const allowedFields = [
      "title", "summary", "introduction", "difficulty",
      "time_required", "tools", "brand_id", "model_id", "model_name",
    ];
    const updates: Record<string, unknown> = {};
    allowedFields.forEach((f) => { if (f in body) updates[f] = body[f]; });

    // Approved guide goes back to draft when edited (requires re-review)
    if (existing.status === "approved") updates.status = "draft";

    const { data, error } = await supabase
      .from("guides")
      .update(updates)
      .eq("guide_id", guideId)
      .select("guide_id, status")
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ guide: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── DELETE — remove guide row + ALL storage images ────────────
// FIX (User Fix #1): Removed the guard that blocked deleting a
// pending guide.  Users can now delete their own guides regardless
// of status (draft, pending, approved, rejected) from the
// Contribution tab.
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { guideId } = await params;

    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: existing } = await supabase
      .from("guides")
      .select("user_id, status")
      .eq("guide_id", guideId)
      .maybeSingle();

    if (!existing || existing.user_id !== authData.user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // ── Clean up step images from storage ─────────────────────
    const adminClient = createAdminClient();
    const storageFolderPath = `Guides/${authData.user.id}/${guideId}`;
    const { data: objects, error: listError } = await adminClient.storage
      .from(BUCKET)
      .list(storageFolderPath, { limit: 200 });

    if (!listError && objects && objects.length > 0) {
      const filePaths = objects.map((obj) => `${storageFolderPath}/${obj.name}`);
      await adminClient.storage.from(BUCKET).remove(filePaths);
    }

    // Delete steps (CASCADE should handle, but be explicit)
    await supabase.from("guide_steps").delete().eq("guide_id", guideId);

    // Delete the guide row
    const { error } = await supabase.from("guides").delete().eq("guide_id", guideId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}