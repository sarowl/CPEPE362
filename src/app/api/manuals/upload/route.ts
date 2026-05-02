// src\app\api\manuals\upload\route.ts
import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { b2, B2_BUCKET } from "@/lib/b2";
import { isAdminEmail } from "@/lib/adminAccounts";
import { createAdminClient } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";
import Busboy from "busboy";
import { Readable } from "stream";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for large file processing

export async function POST(req: NextRequest) {
  const adminEmail = req.headers.get("x-admin-email") ?? "";
  if (!isAdminEmail(adminEmail)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fields: Record<string, string> = {};
  let fileBuffer: Buffer | null = null;
  let fileName = "";
  let fileMime = "";
  let fileSize = 0;

  await new Promise<void>((resolve, reject) => {
    const busboy = Busboy({
      headers: {
        "content-type": req.headers.get("content-type") ?? "",
      },
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    });

    busboy.on("field", (name, value) => {
      fields[name] = value;
    });

    busboy.on("file", (_fieldname, stream, info) => {
      fileName = info.filename;
      fileMime = info.mimeType;
      const chunks: Buffer[] = [];

      stream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
        fileSize += chunk.length;
      });
      
      stream.on("end", () => {
        try {
          fileBuffer = Buffer.concat(chunks);
        } catch (err) {
          reject(new Error(`Failed to concatenate file chunks: ${err}`));
        }
      });
      
      stream.on("error", (err) => {
        reject(new Error(`File stream error: ${err}`));
      });
    });

    busboy.on("finish", () => {
      resolve();
    });
    
    busboy.on("error", (err) => {
      reject(new Error(`Busboy parse error: ${err}`));
    });

    // Pipe the raw request body into busboy
    try {
      if (req.body) {
        const nodeStream = Readable.fromWeb(req.body as any);
        nodeStream.on("error", (err) => {
          reject(new Error(`Request stream error: ${err}`));
        });
        nodeStream.pipe(busboy);
      } else {
        reject(new Error("No request body provided"));
      }
    } catch (err) {
      reject(new Error(`Stream setup error: ${err}`));
    }
  });

  const { brand_id: brandId, model_id: modelId, manual_type: manualType, title } = fields;

  if (!fileBuffer || !brandId || !modelId || !manualType || !title) {
    return NextResponse.json({ 
      error: "Missing required fields.", 
      received: { brandId, modelId, manualType, title, fileBuffer: !!fileBuffer }
    }, { status: 400 });
  }
  if (fileMime !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are allowed." }, { status: 400 });
  }
  if (fileSize > 50 * 1024 * 1024) {
    return NextResponse.json({ error: "File exceeds the 50 MB limit." }, { status: 400 });
  }

  const fileKey = `manuals/${brandId}/${modelId}/${randomUUID()}.pdf`;

  // Upload to Backblaze B2
  await b2.send(
    new PutObjectCommand({
      Bucket:             B2_BUCKET,
      Key:                fileKey,
      Body:               fileBuffer,
      ContentType:        "application/pdf",
      ContentDisposition: `inline; filename="${fileName}"`,
      ContentLength:      fileSize,
    })
  );

  // Save metadata to Supabase
  const { data: manual, error: dbErr } = await createAdminClient()
    .from("manuals")
    .insert({
      brand_id:    brandId,
      model_id:    modelId,
      manual_type: manualType,
      title:       title.trim(),
      file_key:    fileKey,
      file_name:   fileName,
      file_size:   fileSize,
    })
    .select()
    .single();

  if (dbErr) {
    try {
      const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      await b2.send(new DeleteObjectCommand({ Bucket: B2_BUCKET, Key: fileKey }));
    } catch {}
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ manual }, { status: 201 });
}
