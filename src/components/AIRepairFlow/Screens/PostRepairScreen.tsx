import { useEffect, useState, useRef } from "react";
import { CheckCircle2, Calendar, RotateCcw, ChevronRight, Loader2, AlertTriangle } from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

export interface Diagnosis {
  rank: number;
  title: string;
  likelihood: string;
  description: string;
  urgency: "Low" | "Medium" | "High";
  icon?: "disc" | "alert" | "droplets" | "wind";
}

export interface NextMaintenance {
  label: string;
  interval: string;
}

interface PostRepairScreenProps {
  diagnosis: Diagnosis;
  postRepairNote: string;
  nextMaintenance: NextMaintenance;
  carId: number | null;   // ← added
  onRestart: () => void;
}

const PostRepairScreen = ({
  diagnosis,
  postRepairNote,
  nextMaintenance,
  carId,
  onRestart,
}: PostRepairScreenProps) => {
  const [logStatus, setLogStatus] = useState<"idle" | "logging" | "success" | "error">("idle");

  const hasLogged = useRef(false);

useEffect(() => {
  if (!carId || hasLogged.current) return;
  hasLogged.current = true;

  const logRepair = async () => {
    setLogStatus("logging");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        setLogStatus("error");
        return;
      }

      const res = await fetch("/api/maintenance_log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          carId,
          diagnosisTitle: diagnosis.title,
          postRepairNote,
          nextMaintenance,
        }),
      });

      setLogStatus(res.ok ? "success" : "error");
    } catch {
      setLogStatus("error");
    }
  };

  logRepair();
}, []);

  return (
    <div className="px-4 py-6 max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] space-y-8">

      <div className="w-24 h-24 rounded-full overflow-hidden">
        <Image
          src="/success-check.jpg"
          alt="Repair complete"
          width={96}
          height={96}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Repair Complete</h2>
        <p className="text-sm text-muted-foreground">
          {diagnosis.title} — logged successfully
        </p>
      </div>

      <div className="w-full space-y-3">
        <div className="step-card">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <span className="text-sm font-medium text-foreground">Post-repair check</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{postRepairNote}</p>
        </div>

        <div className="step-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Next maintenance</p>
                <p className="text-xs text-muted-foreground">
                  {nextMaintenance.label} — {nextMaintenance.interval}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Log status — only shows if a vehicle was selected */}
        {carId && (
          <div className={`step-card flex items-center gap-3 ${
            logStatus === "error" ? "border-destructive/30 bg-destructive/5" : ""
          }`}>
            {logStatus === "logging" && (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Saving to maintenance history…</p>
              </>
            )}
            {logStatus === "success" && (
              <>
                <CheckCircle2 className="h-4 w-4 text-success" />
                <p className="text-xs text-muted-foreground">Saved to vehicle maintenance history</p>
              </>
            )}
            {logStatus === "error" && (
              <>
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <p className="text-xs text-destructive">Could not save to maintenance history</p>
              </>
            )}
          </div>
        )}
      </div>

      <button
        onClick={onRestart}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <RotateCcw className="h-4 w-4" />
        Start a new repair
      </button>
    </div>
  );
};

export default PostRepairScreen;