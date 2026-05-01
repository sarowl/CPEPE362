import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@supabase/supabase-js";
import { b2, B2_BUCKET } from "@/lib/b2";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const manualId = req.nextUrl.searchParams.get("id");
  if (!manualId) {
    return NextResponse.json({ error: "Missing manual id." }, { status: 400 });
  }

  const { data: manual, error } = await supabaseAdmin
    .from("manuals")
    .select("file_key, file_name")
    .eq("id", manualId)
    .single();

  if (error || !manual) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // Inline view URL — expires in 2 hours
  const viewUrl = await getSignedUrl(
    b2,
    new GetObjectCommand({
      Bucket:                        B2_BUCKET,
      Key:                           manual.file_key,
      ResponseContentDisposition:    `inline; filename="${manual.file_name}"`,
      ResponseContentType:           "application/pdf",
    }),
    { expiresIn: 7200 }
  );

  // Separate download URL — forces browser save dialog
  const downloadUrl = await getSignedUrl(
    b2,
    new GetObjectCommand({
      Bucket:                        B2_BUCKET,
      Key:                           manual.file_key,
      ResponseContentDisposition:    `attachment; filename="${manual.file_name}"`,
      ResponseContentType:           "application/pdf",
    }),
    { expiresIn: 7200 }
  );

  return NextResponse.json({ viewUrl, downloadUrl });
}