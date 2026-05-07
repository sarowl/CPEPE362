import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const error = searchParams.get("error");

  if (error) {
    console.error("Auth error:", error);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error)}`);
  }

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
              console.error("Cookie set error:", e);
            }
          },
        },
      }
    );

    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Exchange error:", exchangeError.message);
      return NextResponse.redirect(`${origin}/login?error=session_exchange_failed`);
    }

    const user = data.session?.user;
    if (user) {
      const authAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      const { data: authUser, error: authUserError } = await authAdmin.auth.admin.getUserById(user.id);

      if (!authUserError && authUser?.user) {
        const bannedUntil = authUser.user.banned_until
          ? new Date(authUser.user.banned_until)
          : null;
        const isSuspended = bannedUntil !== null && bannedUntil > new Date();

        if (isSuspended) {
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/login?error=account_suspended`);
        }
      }

      const createdAt = new Date(user.created_at).getTime();
      const lastSignIn = new Date(user.last_sign_in_at ?? 0).getTime();
      const isNewUser = Math.abs(createdAt - lastSignIn) < 5000;

      if (isNewUser) {
        // Double-check: see if they actually exist in your Users table
        const { data: profile } = await supabase
          .from("Users")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!profile) {
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/login?error=not_registered`);
        }
      }
    }

    return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login`);
}