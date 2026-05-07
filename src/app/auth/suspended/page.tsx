"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { AlertCircle, LogOut } from "lucide-react";

export default function SuspendedPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  useEffect(() => {
    // Check if user is still suspended, redirect if not
    const checkStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !user.user_metadata?.suspended) {
        router.push("/");
      }
    };

    const timer = setTimeout(checkStatus, 1000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="p-3 bg-red-50 border border-red-200 rounded-full">
            <AlertCircle size={32} className="text-red-600" />
          </div>

          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-ink mb-2">
              Account Suspended
            </h1>
           <p className="text-sm text-muted-foreground leading-relaxed">
              Your account has been suspended and is no longer accessible. If you believe this is an error, please contact{" "}
              <a
                href="mailto:support.autubot@gmail.com"
                className="text-ink font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity"
              >
                support.autubot@gmail.com
              </a>{" "}
              for assistance.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 bg-ink text-white font-bold uppercase text-sm hover:bg-ink/90 transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
