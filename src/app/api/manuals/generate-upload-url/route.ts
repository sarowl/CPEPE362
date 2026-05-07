// src/app/api/manuals/generate-upload-url/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { isAdminEmail } from "@/lib/adminAccounts";
import { b2, B2_BUCKET } from "@/lib/b2";

export async function POST(req: NextRequest) {
  try {
    // Step 1: Authenticate as admin
    const adminEmail = req.headers.get("x-admin-email") ?? "";
    if (!adminEmail || !isAdminEmail(adminEmail)) {
      return NextResponse.json(
        { error: "Forbidden — admin only." },
        { status: 403 }
      );
    }

    // Step 2: Validate and parse request body
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const { brandId, modelId, fileName, fileType } = body;

    // Validate required fields
    if (!brandId || !modelId || !fileName || !fileType) {
      return NextResponse.json(
        { error: "Missing required fields: brandId, modelId, fileName, fileType." },
        { status: 400 }
      );
    }

    // Enforce file type validation (only PDF)
    if (fileType !== "application/pdf") {
      return NextResponse.json(
        { error: "Only application/pdf file type is allowed." },
        { status: 400 }
      );
    }

    // Step 3: Generate unique fileKey
    const fileKey = `manuals/${brandId}/${modelId}/${randomUUID()}.pdf`;

    // Step 4: Generate presigned PUT URL (120 seconds expiration)
    const signedUrl = await getSignedUrl(
      b2,
      new PutObjectCommand({
        Bucket: B2_BUCKET,
        Key: fileKey,
        ContentType: fileType,
      }),
      { expiresIn: 120 }
    );

    // Step 5: Return presigned URL and fileKey to client
    return NextResponse.json(
      {
        signedUrl,
        fileKey,
        expiresIn: 120,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Generate upload URL error:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL." },
      { status: 500 }
    );
  }
}
