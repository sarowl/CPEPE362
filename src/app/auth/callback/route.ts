import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // 'next' is the path we want to redirect to after success
  const next = searchParams.get("next") ?? "/";
  const error = searchParams.get("error");

  // 1. Handle explicit Supabase errors (e.g., link expired)
  if (error) {
    console.error("Auth error:", error);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error)}`);
  }

  // 2. Handle the PKCE Code Exchange
  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch (e) {
              // This can be ignored if the middleware is also handling cookies
              console.error("Cookie set error:", e);
            }
          },
        },
      }
    );

    // Exchange the temporary code for a persistent session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Exchange error:", exchangeError.message);
      return NextResponse.redirect(`${origin}/login?error=session_exchange_failed`);
    }

    // Success! Redirect to the intended page (e.g., /auth/update-password)
    return NextResponse.redirect(`${origin}${next}`);
  }

  // 3. Fallback: If no code is present, something went wrong
  return NextResponse.redirect(`${origin}/login`);
}