"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export interface AdminSession {
  email: string;
  name: string;
}

export function useAdminGuard(): AdminSession | null {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("adminSession");
    if (!raw) {
      router.replace("/login");
      return;
    }
    try {
      setSession(JSON.parse(raw) as AdminSession);
    } catch {
      router.replace("/login");
    }
  }, [router]);

  return session;
}

export function clearAdminSession() {
  sessionStorage.removeItem("adminSession");
}