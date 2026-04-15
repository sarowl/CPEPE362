// src/components/AIRepairFlow/Screens/ToolsAndPartsScreen.tsx
import { Wrench, Package, ChevronRight, ArrowLeft } from "lucide-react";
import { Diagnosis } from "./DiagnosisScreen";

interface ToolsAndPartsScreenProps {
  diagnosis: Diagnosis;
  tools: string[];
  parts: string[];
  onProceed: () => void;
  onBack: () => void;
}

const ToolsAndPartsScreen = ({
  diagnosis,
  tools,
  parts,
  onProceed,
  onBack,
}: ToolsAndPartsScreenProps) => {
  return (
    <div className="px-4 py-8 space-y-8 max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Diagnoses
      </button>

      {/* Header */}
      <div className="space-y-1">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider truncate">
          {diagnosis.title}
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Before You Begin
        </h2>
        <p className="text-sm text-muted-foreground">
          Make sure you have everything listed below before starting the repair.
        </p>
      </div>

      {/* Tools */}
      {tools.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Tools Required
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {tools.map((tool, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card shadow-sm"
              >
                <span className="text-sm font-medium text-foreground">{tool}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Parts */}
      {parts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Parts & Consumables
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {parts.map((part, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card shadow-sm"
              >
                <span className="text-sm font-medium text-foreground">{part}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={onProceed}
        className="w-full py-4 bg-primary text-primary-foreground rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all"
      >
        Start Repair
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
};

export default ToolsAndPartsScreen;