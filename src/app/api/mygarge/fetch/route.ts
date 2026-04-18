// ============================================================
//
// GET endpoint: retrieves all vehicles for the authenticated user.
// Also returns associated maintenance logs for each vehicle.
// Used by: Mygarage component on mount, ProblemEntryScreen garage selector.
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { decrypt } from "@/lib/encryption";

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


    const { data: vehicles, error: vehiclesError } = await supabase
      .from("User_cars")
      .select("*")
      .eq("user_id", user.id);

    if (vehiclesError) {
      console.error("Vehicle fetch error:", vehiclesError);
      return NextResponse.json({ message: "Vehicle fetch failed" }, { status: 500 });
    }

    const normalizedVehicles = (vehicles ?? []).map((vehicle) => {
      const decrypted = {
        ...vehicle,
        // Map encrypted fields and decrypt them
        Platenumber: decrypt(vehicle?.platenum || ''),
        vin: decrypt(vehicle?.vin || ''),
        chasisnumber: decrypt(vehicle?.chasis || ''),
        ORnumber: decrypt(vehicle?.ORnum || ''),
        CRnumber: decrypt(vehicle?.CRnum || ''),
        enginenumber: decrypt(
          vehicle?.enginenum ?? 
          vehicle?.enginenumber ?? 
          vehicle?.engine_number ?? 
          vehicle?.engine ?? 
          ''
        ),
      };
      return decrypted;
    });

  
    const { data: maintenance, error: maintenanceError } = await supabase
      .from("Maintenance_History")
      .select("*")
      .eq("user_id", user.id);

    if (maintenanceError) {
      console.error("Maintenance fetch error:", maintenanceError);
      return NextResponse.json({ message: "Maintenance fetch failed" }, { status: 500 });
    }

   
    return NextResponse.json({
      vehicles: normalizedVehicles,
      maintenance,
    });

  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}