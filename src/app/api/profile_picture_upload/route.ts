import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const isPng = file.type === "image/png";
    const isJpeg = file.type === "image/jpeg" || file.type === "image/jpg";

    if (!isPng && !isJpeg) {
      return NextResponse.json({ error: "Only PNG or JPG images are allowed" }, { status: 400 });
    }

    const fileExt = isPng ? "png" : "jpg";
    const filePath = `ProfilePics/${data.user.id}/picture.${fileExt}`;
    const fileBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from("Autobot_Storage")
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Persist the stored file address into Users table.
    // Primary target is `Profilepic` per current schema naming.
    const { error: profilepicError } = await supabase
      .from("Users")
      .update({ Profilepic: filePath } as never)
      .eq("user_id", data.user.id);

    if (profilepicError) {
      // Backward compatibility for environments using `profile_picture`.
      const { error: profilePictureError } = await supabase
        .from("Users")
        .update({ profile_picture: filePath } as never)
        .eq("user_id", data.user.id);

      if (profilePictureError) {
        return NextResponse.json(
          {
            error: `Failed to save file address in Users table (Profilepic/profile_picture): ${profilepicError.message}`,
          },
          { status: 500 }
        );
      }
    }

    const { data: signedData, error: signedError } = await supabase.storage
      .from("Autobot_Storage")
      .createSignedUrl(filePath, 60 * 60 * 24 * 7);

    if (signedError) {
      console.warn("Profile picture signed URL generation failed:", signedError.message);
    }

    return NextResponse.json({
      success: true,
      path: filePath,
      url: signedData?.signedUrl || null,
    });
  } catch (error) {
    console.error("Profile picture upload error:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error && "message" in error
          ? String((error as { message?: unknown }).message)
          : "Upload failed";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
