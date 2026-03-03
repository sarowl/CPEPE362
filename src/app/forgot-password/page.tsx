"use client";
import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Check your email for the reset link!");
    }
    setLoading(false);
  };

  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 bg-background">
      <div className="w-full max-w-[420px]">
        <h1 className="mb-2 text-xl font-semibold text-foreground">Reset your password</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Enter the email address associated with your account and we'll send you a link to reset your password.
        </p>

        <form className="space-y-4" onSubmit={handleResetRequest}>
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            />
          </div>

          {message && <p className="text-sm font-medium text-green-600">{message}</p>}
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 w-full"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link href="/login" className="text-foreground font-medium underline-offset-4 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
};

export default ForgotPassword;