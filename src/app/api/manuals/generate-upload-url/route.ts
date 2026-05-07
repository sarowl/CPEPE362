// src/app/api/manuals/generate-upload-url/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { isAdminEmail } from "@/lib/adminAccounts";
import { b2, B2_BUCKET } from "@/lib/b2";

export async function POST(req: NextRequest) {
  try {
    const adminEmail = req.headers.get("x-admin-email") ?? "";
    if (!adminEmail || !isAdminEmail(adminEmail)) {
      return NextResponse.json(
        { error: "Forbidden — admin only." },
        { status: 403 }
      );
    }

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

    if (!brandId || !modelId || !fileName || !fileType) {
      return NextResponse.json(
        { error: "Missing required fields: brandId, modelId, fileName, fileType." },
        { status: 400 }
      );
    }

    if (fileType !== "application/pdf") {
      return NextResponse.json(
        { error: "Only application/pdf file type is allowed." },
        { status: 400 }
      );
    }

    const fileKey = `manuals/${brandId}/${modelId}/${randomUUID()}.pdf`;

    const signedUrl = await getSignedUrl(
      b2,
      new PutObjectCommand({
        Bucket: B2_BUCKET,
        Key: fileKey,
        ContentType: fileType,
      }),
      { expiresIn: 120 }
    );

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
