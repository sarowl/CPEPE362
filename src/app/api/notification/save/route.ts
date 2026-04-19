import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const smtpUser = process.env.SMTP_EMAIL_USER?.trim();
const smtpPass = process.env.SMTP_EMAIL_PASSWORD?.trim();

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Missing authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Get user from token
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Get body data
    const body = await req.json();
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";

    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required" },
        { status: 400 }
      );
    }

    // Prevent duplicate notifications with the same title/message for this user.
    const { data: existing, error: existingError } = await supabase
      .from("notification")
      .select("id")
      .eq("user_id", user.id)
      .eq("title", title)
      .eq("message", message)
      .limit(1)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { error: "Failed to verify existing notification" },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { message: "Notification already exists", data: existing },
        { status: 200 }
      );
    }

    // Insert notification
    const { data, error } = await supabase
      .from("notification")
      .insert([
        {
          user_id: user.id,
          title,
          message,
          is_read: false,
        },
      ])
      .select();

    if (error) {
      return NextResponse.json(
        { error: "Failed to save notification" },
        { status: 500 }
      );
    }

    if (!user.email) {
      return NextResponse.json(
        { error: "User email is missing" },
        { status: 400 }
      );
    }

    if (!smtpUser || !smtpPass) {
      return NextResponse.json(
        { error: "SMTP email configuration is missing" },
        { status: 500 }
      );
    }

    try {
      const safeTitle = escapeHtml(title);
      const safeMessage = escapeHtml(message).replace(/\n/g, "<br />");
      const previewText = message.length > 120 ? `${message.slice(0, 117)}...` : message;

      await transporter.sendMail({
        from: `Autobot Notifications <${smtpUser}>`,
        to: user.email,
        subject: `New Notification: ${title}`,
        text: `${title}\n\n${message}\n\nOpen the app to view details.`,
        html: `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Notification</title>
  </head>
  <body style="margin:0;padding:0;background:#111111;font-family:Arial,Helvetica,sans-serif;color:#f5f5f5;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${escapeHtml(previewText)}
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#111111;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#1a1a1a;border:1px solid #ff8c00;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="padding:18px 22px;background:#ff8c00;">
                <h1 style="margin:0;font-size:20px;line-height:1.3;color:#111111;">Autobot Notification</h1>
              </td>
            </tr>

            <tr>
              <td style="padding:22px;">
                <p style="margin:0 0 8px;font-size:13px;color:#ffb347;">Title</p>
                <p style="margin:0 0 18px;font-size:18px;font-weight:700;color:#ffffff;">
                  ${safeTitle}
                </p>

                <p style="margin:0 0 8px;font-size:13px;color:#ffb347;">Message</p>
                <p style="margin:0;font-size:15px;line-height:1.6;color:#f5f5f5;">
                  ${safeMessage}
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:14px 22px;background:#141414;border-top:1px solid #2a2a2a;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#bdbdbd;">
                  This is an automated email from Autobot notifications.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
      });
    } catch (emailError) {
      console.error("SMTP sendMail failed:", emailError);
      const errorMessage =
        emailError instanceof Error ? emailError.message : "Unknown SMTP error";

      return NextResponse.json(
        { error: `Email send failed: ${errorMessage}` },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { message: "Notification saved and email sent", data },
      { status: 201 }
    );

  } catch (err) {
    console.error("POST notification error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}