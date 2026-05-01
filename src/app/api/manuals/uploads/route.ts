import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { b2, B2_BUCKET } from "@/lib/b2";
import { isAdminEmail } from "@/lib/adminAccounts"; // your existing helper
import { randomUUID } from "crypto";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

export async function POST(req: NextRequest) {
  const adminEmail = req.headers.get("x-admin-email") ?? "";
  if (!isAdminEmail(adminEmail)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file       = form.get("file") as File | null;
  const brandId    = form.get("brand_id") as string;
  const modelId    = form.get("model_id") as string;
  const manualType = form.get("manual_type") as "user_manual" | "service_manual";
  const title      = form.get("title") as string;

  if (!file || !brandId || !modelId || !manualType || !title) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are allowed." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File exceeds the 50 MB limit." }, { status: 400 });
  }

  const fileKey = `manuals/${brandId}/${modelId}/${randomUUID()}.pdf`;
  const buffer  = Buffer.from(await file.arrayBuffer());

  // 1. Upload binary to Backblaze B2
  await b2.send(
    new PutObjectCommand({
      Bucket:             B2_BUCKET,
      Key:                fileKey,
      Body:               buffer,
      ContentType:        "application/pdf",
      ContentDisposition: `inline; filename="${file.name}"`,
    })
  );

  // 2. Persist metadata to Supabase
  const { data: manual, error: dbErr } = await supabaseAdmin
    .from("manuals")
    .insert({
      brand_id:    brandId,
      model_id:    modelId,
      manual_type: manualType,
      title:       title.trim(),
      file_key:    fileKey,
      file_name:   file.name,
      file_size:   file.size,
    })
    .select()
    .single();

  if (dbErr) {
    // Best-effort: delete the orphaned B2 object
    try {
      const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      await b2.send(new DeleteObjectCommand({ Bucket: B2_BUCKET, Key: fileKey }));
    } catch {}
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ manual }, { status: 201 });
}