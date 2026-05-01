import { NextRequest, NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { b2, B2_BUCKET } from "@/lib/b2";
import { isAdminEmail } from "@/lib/adminAccounts";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(req: NextRequest) {
  const adminEmail = req.headers.get("x-admin-email") ?? "";
  if (!isAdminEmail(adminEmail)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { manual_id } = await req.json();
  if (!manual_id) {
    return NextResponse.json({ error: "Missing manual_id." }, { status: 400 });
  }

  const { data: manual, error } = await supabaseAdmin
    .from("manuals")
    .select("file_key")
    .eq("id", manual_id)
    .single();

  if (error || !manual) {
    return NextResponse.json({ error: "Manual not found." }, { status: 404 });
  }

  // Delete from B2 first
  await b2.send(new DeleteObjectCommand({ Bucket: B2_BUCKET, Key: manual.file_key }));

  // Then remove metadata row
  await supabaseAdmin.from("manuals").delete().eq("id", manual_id);

  return new NextResponse(null, { status: 204 });
}