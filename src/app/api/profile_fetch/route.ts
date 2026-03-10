import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();



  if (error || !data.user) {
    return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
  }

  const { data: user, error: userError } = await supabase
    .from("Users")
    .select("*")
    .eq("user_id", data.user.id)
    .single();

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
   
  }

  let userWithResolvedProfilePicture = user;
  const marker = "/Autobot_Storage/";
  const candidatePaths: string[] = [];

  const storedProfileAddress =
    ((user as { Profilepic?: string | null }).Profilepic ||
      (user as { profile_picture?: string | null }).profile_picture ||
      "").trim();

  if (storedProfileAddress) {
    let storedValue = storedProfileAddress;

    if (storedValue.startsWith("http")) {
      userWithResolvedProfilePicture = {
        ...user,
        profile_picture: storedValue,
      };
    } else {
      if (storedValue.includes(marker)) {
        storedValue = decodeURIComponent(storedValue.split(marker)[1]?.split("?")[0] || "");
      }
      if (storedValue) {
        candidatePaths.push(storedValue);
      }
    }
  }

  // Canonical profile picture locations.
  candidatePaths.push(`ProfilePics/${data.user.id}/picture.jpg`);
  candidatePaths.push(`ProfilePics/${data.user.id}/picture.png`);

  for (const path of Array.from(new Set(candidatePaths))) {
    const { data: signedData, error: signedError } = await supabase.storage
      .from("Autobot_Storage")
      .createSignedUrl(path, 60 * 60 * 24 * 7);

    if (!signedError && signedData?.signedUrl) {
      userWithResolvedProfilePicture = {
        ...user,
        profile_picture: signedData.signedUrl,
      };
      break;
    }
  }
  const { data: experiences, error: expError } = await supabase
    .from("Experiences")
    .select("*")
    .eq("user_id", data.user.id);

  if (expError) {
    return NextResponse.json(
      { error: expError.message },
      { status: 500 }
    );
  }

  const { data: certifications, error: certError } = await supabase
    .from("Certification")
    .select("*")
    .eq("user_id", data.user.id);

  if (certError) {
    return NextResponse.json(
      { error: certError.message },
      { status: 500 }
    );
  }

  const certificationsWithUrls = await Promise.all(
    (certifications || []).map(async (cert) => {
      const rawAddress = cert.address || "";
      let objectPath = rawAddress;

      // Backward compatibility: older rows may store full public URLs.
      const marker = "/Autobot_Storage/";
      if (rawAddress.includes(marker)) {
        objectPath = decodeURIComponent(rawAddress.split(marker)[1]?.split("?")[0] || "");
      }

      if (!objectPath || objectPath.startsWith("http")) {
        return cert;
      }

      const { data: signedData, error: signedError } = await supabase.storage
        .from("Autobot_Storage")
        .createSignedUrl(objectPath, 60 * 60 * 24 * 7);

      if (signedError || !signedData?.signedUrl) {
        return cert;
      }

      return {
        ...cert,
        address: signedData.signedUrl,
      };
    })
  );

  return NextResponse.json(
    { user: userWithResolvedProfilePicture, experiences, certifications: certificationsWithUrls },
    { status: 200 }
  );
}