// app/api/manuals/view/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { createAdminClient } from "@/lib/supabase-admin";
import { b2, B2_BUCKET } from "@/lib/b2";

const supabase = createAdminClient();

export async function GET(req: NextRequest) {
  const manualId = req.nextUrl.searchParams.get("id");
  const mode     = req.nextUrl.searchParams.get("mode") ?? "view"; // "view" | "download"

  if (!manualId) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  const { data: manual, error } = await supabase
    .from("manuals")
    .select("file_key, file_name")
    .eq("id", manualId)
    .single();

  if (error || !manual) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // Stream the file directly from B2 through your server
  const command = new GetObjectCommand({
    Bucket: B2_BUCKET,
    Key:    manual.file_key,
  });

  const b2Response = await b2.send(command);
  const stream     = b2Response.Body as any;

  const disposition = mode === "download"
    ? `attachment; filename="${manual.file_name}"`
    : `inline; filename="${manual.file_name}"`;

  // Stream the PDF body through to the browser
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":                      "application/pdf",
      "Content-Disposition":               disposition,
      "Content-Length":                    buffer.byteLength.toString(),
      "Cache-Control":                     "private, max-age=3600",
      "Access-Control-Allow-Origin":       "*",
      "Access-Control-Allow-Methods":      "GET, OPTIONS",
      "Access-Control-Allow-Headers":      "Content-Type",
      "Access-Control-Max-Age":            "86400",
      "X-Content-Type-Options":            "nosniff",
      "Accept-Ranges":                     "bytes",
    },
  });
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age":       "86400",
    },
  });
}