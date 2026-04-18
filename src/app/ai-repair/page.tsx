"use client";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import RepairFlow from "@/components/RepairFlow";
import VisitorScreen from "@/components/AIRepairFlow/Screens/VisitorScreen";
import { supabase } from "@/lib/supabase";

const Repair = () => {
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setAuthChecked(true);
    };
    checkAuth();
  }, []);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-56px)]">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            Checking authentication...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {user ? <RepairFlow /> : <VisitorScreen />}
    </div>
  );
};

export default Repair;

