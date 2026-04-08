import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    
    const formData = await req.formData();

    const file = formData.get("file") as File;
    const user_id = formData.get("user_id") as string;
    const title = formData.get("title") as string;

    if (!file || !user_id || !title) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;

    const filePath = `Certification/${user_id}/${fileName}`;

    // Convert File to ArrayBuffer for Supabase upload
    const fileBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from("Autobot_Storage")
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("Autobot_Storage")
      .createSignedUrl(filePath, 60 * 60 * 24 * 7);

    // Upload is already successful at this point. If signing fails due policy/object
    // visibility constraints, do not fail the entire request.
    if (signedUrlError) {
      console.warn("Signed URL generation failed, returning path only:", signedUrlError.message);
    }

    const { error: dbError } = await supabase
      .from("Certification")
      .insert({
        user_id: user_id,
        address: filePath,
        title: title,
      });

    if (dbError) throw dbError;

    return NextResponse.json({
      success: true,
      url: signedUrlData?.signedUrl ?? null,
      path: filePath,
    });

  } catch (error) {
    console.error("Certification upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}