// src/components/RepairFlow.tsx
import { useState } from "react";
import ProgressIndicator from "./AIRepairFlow/ProgressIndicator";
import ProblemEntryScreen from "./AIRepairFlow/Screens/ProblemEntryScreen";
import DiagnosisScreen, { Diagnosis } from "./AIRepairFlow/Screens/DiagnosisScreen";
import RepairModeScreen, { RepairResult, RepairProcedure } from "./AIRepairFlow/Screens/RepairModeScreen";
import EscalationScreen from "./AIRepairFlow/Screens/EscalationScreen";
import PostRepairScreen from "./AIRepairFlow/Screens/PostRepairScreen";
import { Vehicle } from "@/components/GarageModal";

type Step = "problem" | "diagnosis" | "repair" | "escalation" | "complete";
const steps: Step[] = ["problem", "diagnosis", "repair", "complete"];
const labels: Record<Step, string> = {
  problem: "Describe Problem",
  diagnosis: "Diagnosis",
  repair: "Repair",
  escalation: "Escalation",
  complete: "Complete",
};

const RepairFlow = () => {
  const [step, setStep] = useState<Step>("problem");
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [selected, setSelected] = useState<Diagnosis | null>(null);
  const [result, setResult] = useState<RepairResult | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  // ↓ Cache the fetched procedure so it survives escalation round-trips
  const [cachedProcedure, setCachedProcedure] = useState<RepairProcedure | null>(null);

  const index = steps.indexOf(step) + 1;

  const reset = () => {
    setStep("problem");
    setDiagnoses([]);
    setSelected(null);
    setResult(null);
    setVehicle(null);
    setCachedProcedure(null); // ← clear cache on full reset
  };

  const showProgress =
    step !== "problem" && step !== "complete" && step !== "escalation";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {showProgress && (
        <div className="px-4 py-2 border-b">
          <ProgressIndicator
            currentStep={index}
            totalSteps={steps.length}
            label={labels[step]}
          />
        </div>
      )}

      <div className="flex-1">
        {step === "problem" && (
          <ProblemEntryScreen
            onSubmit={(_, incoming, v) => {
              setDiagnoses(incoming);
              setVehicle(v);
              setStep("diagnosis");
            }}
          />
        )}

        {step === "diagnosis" && (
          <DiagnosisScreen
            diagnoses={diagnoses}
            onSelect={(d) => {
              setSelected(d);
              setStep("repair");
            }}
          />
        )}

        {step === "repair" && selected && (
          <RepairModeScreen
            diagnosis={selected}
            vehicle={vehicle}
            cachedProcedure={cachedProcedure}          // ← pass cache in
            onProcedureFetched={setCachedProcedure}    // ← store it when loaded
            onComplete={(r) => {
              setResult(r);
              setStep("complete");
            }}
            onEscalate={() => setStep("escalation")}
            onBack={() => {
              setSelected(null);
              setStep("diagnosis");
            }}
          />
        )}

        {step === "escalation" && (
          <EscalationScreen onBack={() => setStep("repair")} />
        )}

        {step === "complete" && selected && result && (
          <PostRepairScreen
            diagnosis={selected}
            postRepairNote={result.postRepairNote}
            nextMaintenance={result.nextMaintenance}
            carId={vehicle?.id ?? null}
            onRestart={reset}
          />
        )}
      </div>
    </div>
  );
};

export default RepairFlow;