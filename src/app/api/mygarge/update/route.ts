import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { encrypt } from "@/lib/encryption";

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      id, 
      model,
      year,
      color,
      photoPath,
      photoUrl,
      type,
      classification,
      platenum,
      vin,
      chasis,
      ORnum,
      CRnum,
      enginenum,
      Grossweight,
      Netweight,
      owner,
    } = body;

   
    if (!id) {
      return NextResponse.json(
        { message: "Missing vehicle ID" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { message: "No auth token" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { message: "Invalid user" },
        { status: 401 }
      );
    }

   
    // 🔥 UPDATE WITH ENCRYPTED SENSITIVE FIELDS
    const updatePayload: Record<string, unknown> = {
      model: encrypt(model),
      year,
      color,
      type,
      classification: classification || "private",
      platenum: encrypt(platenum),
      vin: encrypt(vin),
      chasis: encrypt(chasis),
      ORnum: encrypt(ORnum),
      CRnum: encrypt(CRnum),
      enginenum: encrypt(enginenum),
      Grossweight,
      Netweight,
      owner: encrypt(owner || ""),
    };

    const incomingImage = typeof photoPath === "string" && photoPath.trim()
      ? photoPath.trim()
      : typeof photoUrl === "string" && photoUrl.trim()
        ? photoUrl.trim()
        : "";

    if (incomingImage) {
      if (/^https?:\/\//i.test(incomingImage)) {
        updatePayload.image_path = incomingImage;
      } else {
        const { data: signedData, error: signedError } = await supabase.storage
          .from("Autobot_Storage")
          .createSignedUrl(incomingImage, 60 * 60 * 24 * 30);

        if (signedError || !signedData?.signedUrl) {
          console.error("Signed URL generation failed during update:", signedError);
          updatePayload.image_path = incomingImage;
        } else {
          updatePayload.image_path = signedData.signedUrl;
        }
      }
    }

    const { data, error } = await supabase
      .from("User_cars")
      .update(updatePayload)
      .eq("id", id)
      .eq("user_id", user.id); // 🔒 security

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json(
        { message: "Update failed", error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Updated successfully",
      data,
    });

  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}