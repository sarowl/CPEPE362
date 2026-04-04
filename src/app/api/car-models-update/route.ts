import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { isAdminEmail } from "@/lib/adminAccounts";

const BUCKET = "Autobot_Storage";

// ── PATCH — update model fields ───────────────────────────────
export async function PATCH(req: Request) {
  try {
    const adminEmail = req.headers.get("x-admin-email") ?? "";
    if (!adminEmail || !isAdminEmail(adminEmail)) {
      return NextResponse.json({ error: "Forbidden — admin only." }, { status: 403 });
    }

    const body = await req.json();
    const { model_id, name, category, years, info } = body as {
      model_id: string;
      name: string;
      category: string;
      years: string;
      info?: string | null;
    };

    if (!model_id || !name || !category || !years) {
      return NextResponse.json(
        { error: "model_id, name, category, and years are required." },
        { status: 400 }
      );
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("car_models")
      .update({ name, slug, category, years, info: info ?? null })
      .eq("id", model_id)
      .select("id, name, slug, category, years, info, model_img, brand_id")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: `A model named "${name}" already exists for this brand.` },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Model not found." }, { status: 404 });
    }

    return NextResponse.json({ model: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── DELETE — remove model row + storage folder ────────────────
export async function DELETE(req: Request) {
  try {
    const adminEmail = req.headers.get("x-admin-email") ?? "";
    if (!adminEmail || !isAdminEmail(adminEmail)) {
      return NextResponse.json({ error: "Forbidden — admin only." }, { status: 403 });
    }

    const body = await req.json();
    const { model_id } = body as { model_id: string };

    if (!model_id) {
      return NextResponse.json({ error: "model_id required." }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: model } = await supabase
      .from("car_models")
      .select("brand_id, slug")
      .eq("id", model_id)
      .maybeSingle();

    if (model) {
      const folderPrefix = `Car_Models/${model.brand_id}/${model.slug}/`;
      const { data: objects } = await supabase.storage
        .from(BUCKET)
        .list(`Car_Models/${model.brand_id}/${model.slug}`);

      if (objects && objects.length > 0) {
        const paths = objects.map((o) => `${folderPrefix}${o.name}`);
        await supabase.storage.from(BUCKET).remove(paths);
      }
    }

    const { error } = await supabase
      .from("car_models")
      .delete()
      .eq("id", model_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}