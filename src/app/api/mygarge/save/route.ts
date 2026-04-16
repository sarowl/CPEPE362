// ============================================================
// api/mygarge/save/route.ts — IMPORTED FROM Folder_B
//
// POST endpoint: saves a new vehicle to the user's garage.
// Handles optional photo upload path reference.
// Used by: garagemodel.tsx (Add Vehicle form).
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { encrypt } from "@/lib/encryption";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
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
      Grossweight,
      Netweight,
      owner,
      enginenum,
    } = body;

    // ✅ Required fields
    if (!model || !year || !color) {
      return NextResponse.json(
        { message: "Missing required fields" },
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

    let imageValue: string | null = null;
    const incomingImage = typeof photoPath === "string" && photoPath.trim()
      ? photoPath.trim()
      : typeof photoUrl === "string" && photoUrl.trim()
        ? photoUrl.trim()
        : "";

    if (incomingImage) {
      if (/^https?:\/\//i.test(incomingImage)) {
        imageValue = incomingImage;
      } else {
        const { data: signedData, error: signedError } = await supabase.storage
          .from("Autobot_Storage")
          .createSignedUrl(incomingImage, 60 * 60 * 24 * 30);

        if (signedError || !signedData?.signedUrl) {
          console.error("Signed URL generation failed during save:", signedError);
          imageValue = incomingImage;
        } else {
          imageValue = signedData.signedUrl;
        }
      }
    }

    // 🔥 INSERT ALL FIELDS (encrypt sensitive data)
    const { data, error } = await supabase
      .from("User_cars")
      .insert([
        {
          user_id: user.id,
          model,
          year,
          color,
          image_path: imageValue,
          type,
          classification: classification || "private",
          platenum: encrypt(platenum),
          vin: encrypt(vin),
          chasis: encrypt(chasis),
          ORnum: encrypt(ORnum),
          CRnum: encrypt(CRnum),
          Grossweight,
          Netweight,
          enginenum: encrypt(enginenum),
          owner: body.owner || "", // Optional field
        },
      ]);

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { message: "Insert failed", error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Saved successfully",
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