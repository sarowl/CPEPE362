// ============================================================
//
// GET endpoint: fetches all maintenance log entries for a specific vehicle.
// Used as a utility endpoint for maintenance history queries.
// Query param: car_id (UUID of the vehicle)
// ============================================================
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await req.json();
    const { carId, diagnosisTitle, nextMaintenance, nextMaintenanceDate } = body;

    if (!carId || !diagnosisTitle) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { error: insertError } = await supabase
      .from("Maintenance_History")
      .insert({
        user_id: user.id,
        car_id: carId,
        activity: diagnosisTitle,
        date: new Date().toLocaleDateString("en-CA"), // YYYY-MM-DD from user's perspective
        notes: nextMaintenance
          ? `${nextMaintenance.label} — ${nextMaintenance.interval}`
          : null,
        reminder: nextMaintenanceDate || null, // ISO date string for next maintenance reminder
      });

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Maintenance log error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}