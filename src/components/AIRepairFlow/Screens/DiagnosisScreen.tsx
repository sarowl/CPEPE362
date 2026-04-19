import { useState } from "react";
import {
  ChevronRight,
  X,
  AlertTriangle,
  Disc,
  Droplets,
  Wind,
  Wrench,
  Gauge,
  ShieldAlert,
} from "lucide-react";

export interface Diagnosis {
  rank: number;
  title: string;
  likelihood: string;
  description: string;
  urgency: "Low" | "Medium" | "High";
  icon?: "disc" | "alert" | "droplets" | "wind";
}

interface DiagnosisScreenProps {
  diagnoses: Diagnosis[];
  onSelect: (diagnosis: Diagnosis) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  disc: <Disc className="h-5 w-5" />,
  alert: <AlertTriangle className="h-5 w-5" />,
  droplets: <Droplets className="h-5 w-5" />,
  wind: <Wind className="h-5 w-5" />,
};

const ICON_CYCLE: Diagnosis["icon"][] = ["disc", "droplets", "wind", "alert"];

const DiagnosisScreen = ({ diagnoses, onSelect }: DiagnosisScreenProps) => {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [dismissedRanks, setDismissedRanks] = useState<number[]>([]);

  const handleDismiss = (e: React.MouseEvent, rank: number) => {
    e.stopPropagation();
    setDismissedRanks((prev) => [...prev, rank]);
    if (expanded === rank) setExpanded(null);
  };

  const getUrgencyStyles = (urgency: string) => {
    const u = urgency.toLowerCase();
    if (u.includes("high")) return "text-red-500 bg-red-500/10 border-red-500/20";
    if (u.includes("medium")) return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
  };

  const activeDiagnoses = diagnoses.filter((d) => !dismissedRanks.includes(d.rank));
  const ruledOutDiagnoses = diagnoses.filter((d) => dismissedRanks.includes(d.rank));

  return (
    <div className="px-4 py-8 space-y-6 max-w-lg mx-auto bg-background animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Diagnostic Report</h2>
        <p className="text-sm text-muted-foreground">
          Autobot has identified {activeDiagnoses.length} potential causes.
        </p>
      </div>

      <div className="space-y-4">
        {activeDiagnoses.map((item) => {
          const resolvedIcon = item.icon ?? ICON_CYCLE[(item.rank - 1) % ICON_CYCLE.length];
          return (
            <div
              key={item.rank}
              className={`group border border-border rounded-2xl bg-card p-5 shadow-sm transition-all cursor-pointer ${
                expanded === item.rank
                  ? "ring-2 ring-primary/20 border-primary/30 shadow-md"
                  : "hover:border-primary/40"
              }`}
              onClick={() => setExpanded(expanded === item.rank ? null : item.rank)}
            >
              <div className="flex justify-between items-start w-full">
                <div className="flex gap-4 items-center">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {ICON_MAP[resolvedIcon!] ?? <Wrench className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg leading-tight group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm font-bold text-primary">{item.likelihood}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => handleDismiss(e, item.rank)}
                    className="p-2 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    title="Dismiss"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <span
                  className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-md border inline-flex items-center gap-1 ${getUrgencyStyles(item.urgency)}`}
                >
                  <ShieldAlert className="w-3 h-3" />
                  {item.urgency} Urgency
                </span>
              </div>

              {expanded === item.rank && (
                <div className="mt-4 pt-4 border-t border-border animate-in slide-in-from-top-2">
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6 italic">
                    &ldquo;{item.description}&rdquo;
                  </p>
                  <button
                    onClick={() => onSelect(item)}
                    className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl text-sm font-bold shadow-lg hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    Start Guided Repair
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {ruledOutDiagnoses.length > 0 && (
        <div className="pt-6 border-t border-dashed border-border mt-8">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1 mb-3">
            Dismissed Issues
          </p>
          <div className="space-y-2">
            {ruledOutDiagnoses.map((item) => (
              <div
                key={item.rank}
                className="flex items-center justify-between py-2.5 px-4 rounded-lg bg-secondary/30 opacity-60"
              >
                <span className="text-sm text-muted-foreground line-through italic font-medium">
                  {item.title}
                </span>
                <button
                  onClick={() => setDismissedRanks((prev) => prev.filter((r) => r !== item.rank))}
                  className="text-[10px] text-primary font-bold hover:underline"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-muted/30 border border-border rounded-xl p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <b>Disclaimer:</b> These results are AI-generated based on your descriptions. Always
          prioritize safety and consult a professional for critical mechanical failures.
        </p>
      </div>
    </div>
  );
};

export default DiagnosisScreen;