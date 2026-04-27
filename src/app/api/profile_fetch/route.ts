import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const queryUserId = searchParams.get("user_id");

  // ── PUBLIC lookup: ?user_id=xxx  (no auth required) ──────────
  if (queryUserId) {
    try {
      const supabase = createAdminClient();

      const { data: user, error: userError } = await supabase
        .from("Users")
        .select("user_id, name, about, occupation, Profilepic, created_at")
        .eq("user_id", queryUserId)
        .maybeSingle();

      if (userError)
        return NextResponse.json({ error: userError.message }, { status: 500 });
      if (!user)
        return NextResponse.json({ error: "User not found." }, { status: 404 });

      // Resolve profile picture to a public/signed URL
      let profilePicUrl: string | null = null;
      const rawPic: string = (user.Profilepic ?? "").trim();

      if (rawPic) {
        if (rawPic.startsWith("http")) {
          profilePicUrl = rawPic;
        } else {
          // Try to get a signed URL
          const { data: signedData } = await supabase.storage
            .from("Autobot_Storage")
            .createSignedUrl(rawPic, 60 * 60 * 24 * 7);
          if (signedData?.signedUrl) profilePicUrl = signedData.signedUrl;
        }
      }

      // Fallback canonical paths
      if (!profilePicUrl) {
        for (const path of [
          `ProfilePics/${queryUserId}/picture.jpg`,
          `ProfilePics/${queryUserId}/picture.png`,
        ]) {
          const { data: sd } = await supabase.storage
            .from("Autobot_Storage")
            .createSignedUrl(path, 60 * 60 * 24 * 7);
          if (sd?.signedUrl) { profilePicUrl = sd.signedUrl; break; }
        }
      }

      return NextResponse.json({
        user: {
          user_id:    user.user_id,
          name:       user.name,
          about:      user.about,
          occupation: user.occupation,
          Profilepic: profilePicUrl ?? user.Profilepic,
          profile_picture: profilePicUrl ?? user.Profilepic,
          created_at: user.created_at,
        },
      }, { status: 200 });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // ── AUTHENTICATED lookup: no ?user_id → return current user ──
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

  const storedProfileAddress = (
    ((user as { Profilepic?: string | null }).Profilepic ||
      (user as { profile_picture?: string | null }).profile_picture || "")
  ).trim();

  if (storedProfileAddress) {
    let storedValue = storedProfileAddress;
    if (storedValue.startsWith("http")) {
      userWithResolvedProfilePicture = { ...user, profile_picture: storedValue };
    } else {
      if (storedValue.includes(marker)) {
        storedValue = decodeURIComponent(storedValue.split(marker)[1]?.split("?")[0] || "");
      }
      if (storedValue) candidatePaths.push(storedValue);
    }
  }

  candidatePaths.push(`ProfilePics/${data.user.id}/picture.jpg`);
  candidatePaths.push(`ProfilePics/${data.user.id}/picture.png`);

  for (const path of Array.from(new Set(candidatePaths))) {
    const { data: signedData, error: signedError } = await supabase.storage
      .from("Autobot_Storage")
      .createSignedUrl(path, 60 * 60 * 24 * 7);
    if (!signedError && signedData?.signedUrl) {
      userWithResolvedProfilePicture = { ...user, profile_picture: signedData.signedUrl };
      break;
    }
  }

  const { data: experiences, error: expError } = await supabase
    .from("Experiences")
    .select("*")
    .eq("user_id", data.user.id);

  if (expError)
    return NextResponse.json({ error: expError.message }, { status: 500 });

  const { data: certifications, error: certError } = await supabase
    .from("Certification")
    .select("*")
    .eq("user_id", data.user.id);

  if (certError)
    return NextResponse.json({ error: certError.message }, { status: 500 });

  const certificationsWithUrls = await Promise.all(
    (certifications || []).map(async (cert) => {
      const rawAddress = cert.address || "";
      let objectPath = rawAddress;
      if (rawAddress.includes(marker)) {
        objectPath = decodeURIComponent(rawAddress.split(marker)[1]?.split("?")[0] || "");
      }
      if (!objectPath || objectPath.startsWith("http")) return cert;
      const { data: signedData, error: signedError } = await supabase.storage
        .from("Autobot_Storage")
        .createSignedUrl(objectPath, 60 * 60 * 24 * 7);
      if (signedError || !signedData?.signedUrl) return cert;
      return { ...cert, address: signedData.signedUrl, path: objectPath };
    })
  );

  return NextResponse.json(
    { user: userWithResolvedProfilePicture, experiences, certifications: certificationsWithUrls },
    { status: 200 }
  );
}
