import { useState } from "react";
import ProgressIndicator from "./AIRepairFlow/ProgressIndicator";
import ProblemEntryScreen from "./AIRepairFlow/Screens/ProblemEntryScreen";
import DiagnosisScreen from "./AIRepairFlow/Screens/DiagnosisScreen";
import RepairModeScreen from "./AIRepairFlow/Screens/RepairModeScreen";
import VisualAssistScreen from "./AIRepairFlow/Screens/VisualAssistScreen";
import EscalationScreen from "./AIRepairFlow/Screens/EscalationScreen";
import PostRepairScreen from "./AIRepairFlow/Screens/PostRepairScreen";
import { Diagnosis } from "./AIRepairFlow/Screens/DiagnosisScreen";

type FlowStep = "problem" | "diagnosis" | "repair" | "visual" | "escalation" | "complete";

const stepLabels: Record<FlowStep, string> = {
  problem: "Describe Problem",
  diagnosis: "Diagnosis",
  repair: "Repair",
  visual: "Visual Check",
  escalation: "Escalation",
  complete: "Complete",
};

const stepOrder: FlowStep[] = ["problem", "diagnosis", "repair", "visual", "complete"];

const RepairFlow = () => {
  const [currentStep, setCurrentStep] = useState<FlowStep>("problem");
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);        // ← added
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<Diagnosis | null>(null); // ← added
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
            onSubmit={(problem, incomingDiagnoses) => {   // ← capture both args
              setDiagnoses(incomingDiagnoses);
              setShowVehicle(true);
              setCurrentStep("diagnosis");
            }}
          />
        )}

        {currentStep === "diagnosis" && (
          <DiagnosisScreen
            diagnoses={diagnoses}                          // ← pass diagnoses down
            onSelect={(diagnosis) => {
              setSelectedDiagnosis(diagnosis);             // ← store selection
              setCurrentStep("repair");
            }}
          />
        )}

        {currentStep === "repair" && (
          <RepairModeScreen
            diagnosis={selectedDiagnosis}                 // ← pass to repair screen when ready
            onComplete={() => setCurrentStep("visual")}
            onEscalate={() => setCurrentStep("escalation")}
          />
        )}

        {currentStep === "visual" && (
          <VisualAssistScreen
            onConfirm={() => setCurrentStep("complete")}
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