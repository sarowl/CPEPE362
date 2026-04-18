import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { isAdminEmail } from "@/lib/adminAccounts";

const BUCKET = "Autobot_Storage";
const KEEP_CONTENT = new Uint8Array(0); // zero-byte placeholder

export async function POST(req: Request) {
  try {
    // Verify admin identity first
    const adminEmail = req.headers.get("x-admin-email") ?? "";
    if (!adminEmail || !isAdminEmail(adminEmail)) {
      return NextResponse.json({ error: "Forbidden — admin only." }, { status: 403 });
    }

    const body = await req.json();
    const { brand_id, name, category, years, info } = body as {
      brand_id: string;
      name: string;
      category: string;
      years: string;
      info?: string | null;
    };

    if (!brand_id || !name || !category || !years) {
      return NextResponse.json(
        { error: "brand_id, name, category, and years are required." },
        { status: 400 }
      );
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");

    // Use admin client — bypasses RLS so INSERT succeeds without a
    // Supabase auth session (Admin Fix #3)
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("car_models")
      .insert([{ brand_id, name, slug, category, years, info: info ?? null }])
      .select("id, name, slug, category, years, info, model_img, brand_id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: `A model named "${name}" already exists for this brand.` },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const keepPath = `Car_Models/${data.id}/.keep`;
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .upload(keepPath, KEEP_CONTENT, {
        contentType: "application/octet-stream",
        upsert: false,
      });

    if (storageError && !storageError.message.includes("already exists")) {
      console.error(`Failed to create storage folder for model ${data.id}:`, storageError.message);
    }

    return NextResponse.json({ model: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
