// ============================================================
//
// PATCH endpoint: updates an existing maintenance log entry.
// If reminder date changes, updates associated notification.
// Used by: Mygarage component maintenance edit flow.
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { encrypt } from "@/lib/encryption";

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function PUT(req: NextRequest) {
	try {
		const body = await req.json();
		const { id, activity, date, notes, reminder } = body;

		if (!id || !activity || !date) {
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
			.update({
				activity: encrypt(activity),
				date: encrypt(date),
				notes: encrypt(notes || ""),
				reminder: encrypt(typeof reminder === "string" ? reminder.trim() : ""),
			})
			.eq("id", id)
			.eq("user_id", user.id)
			.select("id")
			.single();

		if (error) {
			console.error("Maintenance update error:", error);
			return NextResponse.json(
				{ message: "Update failed", error: error.message },
				{ status: 500 }
			);
		}

		return NextResponse.json({
			message: "Maintenance history updated",
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


