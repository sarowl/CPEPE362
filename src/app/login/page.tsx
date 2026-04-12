"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const Login = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };
  const handleGoogleAuth = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
      skipBrowserRedirect: false,
    },
  });

  if (error) setError(error.message);
};

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

      try {
      // ── ADMIN CHECK (runs BEFORE Supabase) ─────────────────
      // If the entered credentials match a hardcoded admin account,
      // store a lightweight admin flag in sessionStorage and
      // redirect straight to the admin dashboard — no Supabase call needed.
      const adminMatch = findAdmin(formData.email, formData.password);
      if (adminMatch) {
        sessionStorage.setItem(
          "adminSession",
          JSON.stringify({ email: adminMatch.email, name: adminMatch.name })
        );
        router.push("/admin");
        return;
      }
      // ───────────────────────────────────────────────────────
 
      // Normal Supabase login for regular users
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
 
      if (error) {
        setError(error.message);
        return;
      }
 
      router.push("/");
      router.refresh(); // refresh server components to pick up new session
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4">
      <div className="w-full max-w-[420px]">
        <h1 className="mb-6 text-xl font-semibold text-foreground">Sign in</h1>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
                Forgot Password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button className="w-full" size="lg" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <Button variant="outline" className="w-full" size="lg" type="button" onClick={handleGoogleAuth}>
          Continue with Google
        </Button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/signup" className="text-foreground underline-offset-4 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </main>
  );
};

// 3. Create the wrapped component for the export
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}