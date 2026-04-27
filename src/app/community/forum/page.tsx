"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CommunityForumRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/forum");
  }, [router]);
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      Redirecting to Forum...
    </div>
  );
}
