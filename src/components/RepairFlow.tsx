// src/components/RepairFlow.tsx
import { useState } from "react";
import ProgressIndicator from "./AIRepairFlow/ProgressIndicator";
import ProblemEntryScreen from "./AIRepairFlow/Screens/ProblemEntryScreen";
import DiagnosisScreen from "./AIRepairFlow/Screens/DiagnosisScreen";
import RepairModeScreen from "./AIRepairFlow/Screens/RepairModeScreen";
import EscalationScreen from "./AIRepairFlow/Screens/EscalationScreen";
import PostRepairScreen from "./AIRepairFlow/Screens/PostRepairScreen";
import { Diagnosis } from "./AIRepairFlow/Screens/DiagnosisScreen";

// 1. Removed 'visual' from the type definition
type FlowStep = "problem" | "diagnosis" | "repair" | "escalation" | "complete";

const stepLabels: Record<FlowStep, string> = {
  problem: "Describe Problem",
  diagnosis: "Diagnosis",
  repair: "Repair",
  escalation: "Escalation",
  complete: "Complete",
};

// 2. Removed 'visual' from the step order array
const stepOrder: FlowStep[] = ["problem", "diagnosis", "repair", "complete"];

const RepairFlow = () => {
  const [currentStep, setCurrentStep] = useState<FlowStep>("problem");
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<Diagnosis | null>(null);
  const [showVehicle, setShowVehicle] = useState(false);

  const currentIndex = stepOrder.indexOf(currentStep) + 1;

  const restart = () => {
    setCurrentStep("problem");
    setDiagnoses([]);
    setSelectedDiagnosis(null);
    setShowVehicle(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {showVehicle && currentStep !== "complete" && currentStep !== "escalation" && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <div className="flex-1">
            <ProgressIndicator
              currentStep={currentIndex}
              totalSteps={stepOrder.length}
              label={stepLabels[currentStep]}
            />
          </div>
        </div>
      )}

      <div className="flex-1">
        {currentStep === "problem" && (
          <ProblemEntryScreen
            onSubmit={(problem, incomingDiagnoses) => {
              setDiagnoses(incomingDiagnoses);
              setShowVehicle(true);
              setCurrentStep("diagnosis");
            }}
          />
        )}

        {currentStep === "diagnosis" && (
          <DiagnosisScreen
            diagnoses={diagnoses}
            onSelect={(diagnosis) => {
              setSelectedDiagnosis(diagnosis);
              setCurrentStep("repair");
            }}
          />
        )}

        {currentStep === "repair" && (
          <RepairModeScreen
            diagnosis={selectedDiagnosis}
            // 3. Updated onComplete to jump directly to 'complete'
            onComplete={() => setCurrentStep("complete")}
            onEscalate={() => setCurrentStep("escalation")}
            onBack={() => {
              setSelectedDiagnosis(null);
              setCurrentStep("diagnosis");
            }}
          />
        )}

        {currentStep === "escalation" && (
          <EscalationScreen
            onBack={() => setCurrentStep("repair")}
          />
        )}

        {currentStep === "complete" && (
          <PostRepairScreen onRestart={restart} />
        )}
      </div>
    </div>
  );
};

export default RepairFlow;