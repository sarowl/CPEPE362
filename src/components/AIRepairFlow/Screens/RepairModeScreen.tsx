import { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Volume2,
  VolumeX,
  ChevronLeft,
  Loader2,
  WrenchIcon,
} from "lucide-react";
import { Diagnosis } from "./DiagnosisScreen";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RepairStep {
  id: number;
  title: string;
  instruction: string;
}

interface RepairModeScreenProps {
  diagnosis: Diagnosis | null;
  problemContext?: string;
  onComplete: () => void;
  onEscalate: () => void;
  onBack: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const RepairModeScreen = ({
  diagnosis,
  problemContext,
  onComplete,
  onEscalate,
  onBack,
}: RepairModeScreenProps) => {
  const [steps, setSteps] = useState<RepairStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch AI-generated repair steps ────────────────────────────────────────
  useEffect(() => {
    if (!diagnosis) return;

    const fetchSteps = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/repair_procedure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ diagnosis, problemContext }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data?.error ?? `Server error ${res.status}`);
        }

        const data = await res.json();

        if (!Array.isArray(data.steps) || data.steps.length === 0) {
          throw new Error("No repair steps were returned. Please try again.");
        }

        setSteps(data.steps);
      } catch (err: any) {
        setError(err.message ?? "Failed to load repair procedure.");
      } finally {
        setLoading(false);
      }
    };

    fetchSteps();
  }, [diagnosis, problemContext]);

  // ── Derived state ───────────────────────────────────────────────────────────
  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const confirmStep = () => {
    if (!step) return;
    setCompletedSteps(new Set([...completedSteps, step.id]));
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        {/* Back button */}
        <div className="w-full flex">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Diagnoses
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 mt-8">
          <div className="relative">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <WrenchIcon className="h-8 w-8 text-primary" />
            </div>
            <Loader2 className="h-5 w-5 text-primary animate-spin absolute -top-1 -right-1" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-foreground">
              Building your repair guide…
            </p>
            <p className="text-sm text-muted-foreground">
              Autobot is generating a custom procedure for{" "}
              <span className="text-foreground font-medium">
                {diagnosis?.title}
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Diagnoses
        </button>

        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-5 rounded-xl flex gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-sm">Failed to load repair guide</p>
            <p className="text-sm opacity-80">{error}</p>
          </div>
        </div>

        <button
          onClick={() => {
            setError(null);
            setLoading(true);
            setSteps([]);
            setCurrentStep(0);
            setCompletedSteps(new Set());
          }}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Main repair UI ──────────────────────────────────────────────────────────
  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Diagnoses
        </button>

        <button
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {voiceEnabled ? (
            <Volume2 className="h-4 w-4 text-primary" />
          ) : (
            <VolumeX className="h-4 w-4" />
          )}
          Voice {voiceEnabled ? "On" : "Off"}
        </button>
      </div>

      {/* Diagnosis label */}
      {diagnosis && (
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider truncate">
          {diagnosis.title}
        </p>
      )}

      {/* Step counter */}
      <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
        Step {currentStep + 1} of {steps.length}
      </span>

      {/* Progress dots */}
      <div className="flex gap-1.5">
        {steps.map((s, i) => (
          <div
            key={s.id}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              completedSteps.has(s.id)
                ? "bg-primary"
                : i === currentStep
                ? "bg-primary/40 animate-pulse"
                : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Step title + instruction */}
      {step && (
        <div className="space-y-4 animate-slide-up">
          <h2 className="text-2xl font-bold text-foreground leading-tight">
            {step.title}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {step.instruction}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="pt-4 space-y-3">
        <button
          onClick={confirmStep}
          className="w-full py-4 bg-primary text-primary-foreground rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all"
        >
          <CheckCircle2 className="h-5 w-5" />
          {isLastStep ? "Finalize Repair" : "Confirm Step Complete"}
        </button>

        <button
          onClick={onEscalate}
          className="w-full py-3 text-xs text-muted-foreground hover:text-destructive transition-colors underline underline-offset-4"
        >
          This step is stuck or looks different than the guide
        </button>
      </div>
    </div>
  );
};

export default RepairModeScreen;