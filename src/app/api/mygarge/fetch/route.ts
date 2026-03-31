import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json({ message: "No auth token" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ message: "Invalid user" }, { status: 401 });
    }

    // ✅ FETCH VEHICLES
    const { data: vehicles, error: vehiclesError } = await supabase
      .from("User_cars")
      .select("*")
      .eq("user_id", user.id);

    if (vehiclesError) {
      console.error("Vehicle fetch error:", vehiclesError);
      return NextResponse.json({ message: "Vehicle fetch failed" }, { status: 500 });
    }

    // ✅ FETCH MAINTENANCE HISTORY
    const { data: maintenance, error: maintenanceError } = await supabase
      .from("Maintenance_History")
      .select("*")
      .eq("user_id", user.id);

    if (maintenanceError) {
      console.error("Maintenance fetch error:", maintenanceError);
      return NextResponse.json({ message: "Maintenance fetch failed" }, { status: 500 });
    }

    // ✅ RETURN BOTH
    return NextResponse.json({
      vehicles,
      maintenance,
    });

  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}