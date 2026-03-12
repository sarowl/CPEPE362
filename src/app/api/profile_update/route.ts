import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { about, occupation, name, experiences } = body;
const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const userId = data.user.id;

    // Build update object dynamically
    const updateData: any = {};

    if (about !== undefined) updateData.about = about;
    if (occupation !== undefined) updateData.occupation = occupation;
    if (name !== undefined) updateData.name = name;

    // Only update if something exists
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from("Users")
        .update(updateData)
        .eq("user_id", userId);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }
    }

    // Handle experiences separately
    if (experiences !== undefined) {
      await supabase
        .from("Experiences")
        .delete()
        .eq("user_id", userId);

      const formattedExperiences = experiences.map((content: string) => ({
        user_id: userId,
        content,
      }));

      const { error: expError } = await supabase
        .from("Experiences")
        .insert(formattedExperiences);

      if (expError) {
        return NextResponse.json(
          { error: expError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      message: "Profile updated successfully",
    });

  } catch (error) {
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}