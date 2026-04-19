// ============================================================
//
// POST endpoint: saves a new maintenance log entry for a vehicle.
// If a reminder date is set, also triggers /api/notification/save
// so the user gets a notification reminder in the Navbar bell.
// Used by: Mygarage component maintenance form.
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { encrypt } from "@/lib/encryption";

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { car_id, activity, date, notes, reminder } = body;

		if (!car_id || !activity || !date) {
			return NextResponse.json(
				{ message: "Missing required fields" },
				{ status: 400 }
			);
		}

		if (typeof reminder === "string" && reminder.trim() && !DATE_ONLY_REGEX.test(reminder.trim())) {
			return NextResponse.json(
				{ message: "Reminder must be a date in YYYY-MM-DD format" },
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

		const { data, error } = await supabase
			.from("Maintenance_History")
			.insert([
				{
					user_id: user.id,
					car_id,
					activity: encrypt(activity),
					date: encrypt(date),
					notes: encrypt(notes || ""),
					reminder: encrypt(typeof reminder === "string" ? reminder.trim() : ""),
				},
			]);

		if (error) {
			console.error("Maintenance insert error:", error);
			return NextResponse.json(
				{ message: "Insert failed", error: error.message },
				{ status: 500 }
			);
		}

		return NextResponse.json({
			message: "Maintenance history saved",
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



