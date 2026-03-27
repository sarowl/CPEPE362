import { useState } from "react";
import { AlertTriangle, CheckCircle2, Volume2, VolumeX } from "lucide-react";
import { Diagnosis } from "./DiagnosisScreen";

interface RepairStep {
  id: number;
  instruction: string;
  detail?: string;
  safetyWarning?: string;
  specs?: string;
  image: boolean;
}

interface RepairModeScreenProps {
  diagnosis: Diagnosis | null;
  onComplete: () => void;
  onEscalate: () => void;
}

const repairSteps: RepairStep[] = [
  {
    id: 1,
    instruction: "Secure the vehicle on jack stands",
    detail: "Place the jack under the designated lift point on the frame. Lift until the wheel is off the ground. Place jack stands and lower onto them.",
    safetyWarning: "Never work under a vehicle supported only by a jack. Always use jack stands on a flat, solid surface.",
    image: false,
  },
  {
    id: 2,
    instruction: "Remove the wheel",
    detail: "Loosen lug nuts in a star pattern. Remove the wheel and set it aside.",
    specs: "Torque: 80-100 ft-lbs (reinstall)",
    image: false,
  },
  {
    id: 3,
    instruction: "Remove brake caliper bolts",
    detail: "Locate the two slide pin bolts on the back of the caliper. Remove with a socket wrench. Slide the caliper off the rotor.",
    safetyWarning: "Do not let the caliper hang by the brake hose. Support it with a wire or bungee cord.",
    specs: "Bolt size: 14mm typical",
    image: true,
  },
  {
    id: 4,
    instruction: "Inspect brake pad thickness",
    detail: "Remove the old pads from the caliper bracket. Check thickness — replace if less than 3mm of friction material remains.",
    specs: "Min. thickness: 3mm / 0.12in",
    image: true,
  },
  {
    id: 5,
    instruction: "Install new brake pads",
    detail: "Apply anti-squeal compound to the back of the pads. Insert into the caliper bracket with friction side facing the rotor.",
    image: false,
  },
  {
    id: 6,
    instruction: "Compress caliper piston",
    detail: "Use a C-clamp or caliper tool to slowly push the piston back into the caliper body. This makes room for the new, thicker pads.",
    safetyWarning: "Open the brake fluid reservoir cap before compressing to prevent pressure buildup.",
    image: false,
  },
  {
    id: 7,
    instruction: "Reassemble and torque to spec",
    detail: "Slide caliper over new pads, reinstall bolts, mount wheel, and torque lug nuts.",
    specs: "Caliper bolts: 25-35 ft-lbs | Lug nuts: 80-100 ft-lbs",
    image: false,
  },
];

const RepairModeScreen = ({ onComplete, onEscalate }: RepairModeScreenProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const step = repairSteps[currentStep];
  const isLastStep = currentStep === repairSteps.length - 1;

  const confirmStep = () => {
    setCompletedSteps(new Set([...completedSteps, step.id]));
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      {/* Step counter & voice toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          Step {currentStep + 1} of {repairSteps.length}
        </span>
        <button
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {voiceEnabled ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4" />}
          Voice Guidance {voiceEnabled ? "On" : "Off"}
        </button>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5">
        {repairSteps.map((s, i) => (
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

      {/* Safety warning - Crucial for DIYers */}
      {step.safetyWarning && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl flex gap-3 animate-slide-up">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium leading-snug">{step.safetyWarning}</p>
        </div>
      )}

      {/* Main instruction */}
      <div className="space-y-4 animate-slide-up">
        <h2 className="text-2xl font-bold text-foreground leading-tight">
          {step.instruction}
        </h2>

        {/* Instructions and Detail are now always visible for clarity */}
        {step.detail && (
          <p className="text-sm text-muted-foreground leading-relaxed">{step.detail}</p>
        )}

        {/* Specs are now treated as a 'Pro Tip' or Reference always available */}
        {step.specs && (
          <div className="bg-muted/50 border border-border rounded-lg px-4 py-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Technical Specs</span>
            <div className="font-mono text-sm text-foreground">
              {step.specs}
            </div>
          </div>
        )}
      </div>

      {/* Image */}
      {step.image && (
        <div className="rounded-xl overflow-hidden border border-border shadow-sm">
          <img
            src="/brake-detail.jpg"
            alt="Brake component detail"
            className="w-full h-48 object-cover"
          />
        </div>
      )}

      {/* Confirm button */}
      <div className="pt-4 space-y-3">
        <button
          onClick={confirmStep}
          className="w-full py-4 bg-primary text-primary-foreground rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all"
        >
          <CheckCircle2 className="h-5 w-5" />
          {isLastStep ? "Finalize Repair" : "Confirm Step Complete"}
        </button>

        {/* Escalate */}
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