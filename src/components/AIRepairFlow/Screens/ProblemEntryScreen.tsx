// ============================================================
// AIRepairFlow/Screens/ProblemEntryScreen.tsx — IMPORTED FROM Folder_B
//
// Step 1 of the AI repair flow: user describes their car problem.
// Features:
//  - Optional garage vehicle selector (calls /api/mygarge/fetch)
//  - Free-text problem description
//  - Dynamic Q&A follow-up questions from AI
//  - On submit: calls /api/problem_entry_screen (Gemini AI) to get diagnoses
//  - Passes diagnoses + selected vehicle to parent RepairFlow component
// ============================================================
import { useState } from "react";
import { Search, ArrowRight, Loader2, Logs } from "lucide-react";
import GarageModal, { Vehicle } from "@/components/GarageModal";
import { supabase } from "@/lib/supabase";

interface QA {
  question: string;
  answer: string;
}

type GeminiResult =
  | { type: "questions"; questions: string[] }
  | { type: "diagnosis"; diagnoses: any[] }
  | { type: "validation"; isValid: boolean };

interface Props {
  onSubmit: (problem: string, diagnoses: any[], vehicle: Vehicle | null) => void; 
}

async function getNextStep(
  callType: "validate-input" | "get-questions" | "get-diagnosis",
  initialProblem: string,
  qaHistory: QA[]
): Promise<GeminiResult> {
  const res = await fetch("/api/problem_entry_screen", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callType, initialProblem, qaHistory }),
  });

  if (!res.ok) throw new Error();
  return res.json();
}

const ProblemEntryScreen = ({ onSubmit }: Props) => {
  const [phase, setPhase] = useState<"initial" | "followup" | "diagnosing">("initial");
  const [initialProblem, setInitialProblem] = useState("");
  const [input, setInput] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<QA[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isGarageOpen, setIsGarageOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [garageVehicles, setGarageVehicles] = useState<Vehicle[]>([]);
  const [garageLoading, setGarageLoading] = useState(false);
  const [garageFetchError, setGarageFetchError] = useState<string | null>(null);

  const handleOpenGarage = async () => {
    setIsGarageOpen(true);
    if (garageVehicles.length > 0) return;

    setGarageLoading(true);
    setGarageFetchError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setGarageFetchError("You must be logged in to view your garage.");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        setGarageFetchError("Session expired. Please log in again.");
        return;
      }

      const res = await fetch("/api/mygarge/fetch", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setGarageFetchError("Could not load your garage.");
        return;
      }

      const data = await res.json();

      const mapped: Vehicle[] = (data.vehicles ?? []).map((v: any) => ({
        id: v.id,                          // ← now included
        model: v.model ?? "Unknown model",
        year: v.year ?? "Unknown year",
      }));

      setGarageVehicles(mapped);
    } catch {
      setGarageFetchError("Could not load your garage.");
    } finally {
      setGarageLoading(false);
    }
  };

  const buildContext = (qa: QA[]) => {
    const lines = [`Problem: ${initialProblem}`];
    qa.forEach((q) => {
      lines.push(`Q: ${q.question}`);
      lines.push(`A: ${q.answer}`);
    });
    return lines.join("\n");
  };

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setError(null);

    if (phase === "initial") {
      setInput("");
      setLoading(true);

      try {
        const validation = await getNextStep("validate-input", text, []);

        if (validation.type === "validation" && !validation.isValid) {
          setError("Enter a vehicle-related problem.");
          return;
        }

        const enrichedProblem = selectedVehicle
          ? `Vehicle: ${selectedVehicle.year} ${selectedVehicle.model}\nProblem: ${text}`
          : text;

        setInitialProblem(enrichedProblem);

        const result = await getNextStep("get-questions", enrichedProblem, []);

        if (result.type === "diagnosis") {
          onSubmit(enrichedProblem, result.diagnoses, selectedVehicle); // ← pass vehicle
        }

        if (result.type === "questions") {
          setQuestions(result.questions);
          setIndex(0);
          setPhase("followup");
        }
      } catch {
        setError("AI request failed.");
      } finally {
        setLoading(false);
      }

      return;
    }

    if (phase === "followup") {
      const updated = [
        ...history,
        { question: questions[index], answer: text },
      ];

      setHistory(updated);
      setInput("");

      if (index + 1 < questions.length) {
        setIndex(index + 1);
        return;
      }

      setPhase("diagnosing");
      setLoading(true);

      try {
        const result = await getNextStep("get-diagnosis", initialProblem, updated);

        if (result.type === "diagnosis") {
          onSubmit(buildContext(updated), result.diagnoses, selectedVehicle); // ← pass vehicle
        } else {
          setError("Unexpected response.");
          setPhase("followup");
        }
      } catch {
        setError("AI request failed.");
        setPhase("followup");
      } finally {
        setLoading(false);
      }
    }
  };

  const currentQuestion = phase === "followup" ? questions[index] : null;

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-lg space-y-6">

        <div className="text-center">
          <h1 className="text-xl font-bold">
            {phase === "initial" ? "What's the problem?" : "Follow-up"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {phase === "initial"
              ? "Describe the issue"
              : `Question ${index + 1} of ${questions.length}`}
          </p>
        </div>

        {selectedVehicle && (
          <div className="text-sm bg-secondary px-3 py-2 rounded-lg">
            {selectedVehicle.year} {selectedVehicle.model}
          </div>
        )}

        {currentQuestion && !loading && (
          <p className="text-sm font-medium">{currentQuestion}</p>
        )}

        {loading && (
          <div className="flex justify-center">
            <Loader2 className="animate-spin" />
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {garageFetchError && (
          <p className="text-xs text-amber-500 text-center">{garageFetchError}</p>
        )}

        <div className="flex items-end gap-2 border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
          <Search className="h-4 w-4 text-muted-foreground mb-2 flex-shrink-0" />
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            disabled={loading}
            rows={1}
            placeholder="Describe your problem…"
            className="flex-1 resize-none bg-transparent outline-none text-sm py-1.5 custom-scrollbar"
            style={{ maxHeight: "200px", overflowY: "auto" }}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 mb-0.5 p-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <ArrowRight className="h-4 w-4" />}
          </button>
        </div>

        <GarageModal
          isOpen={isGarageOpen}
          onClose={() => setIsGarageOpen(false)}
          cars={garageVehicles}
          onSelect={(car) => setSelectedVehicle(car)}
          isLoading={garageLoading}
        />

        {history.length > 0 && (
          <div className="text-xs space-y-1">
            {history.map((q, i) => (
              <div key={i}>
                <strong>{q.question}</strong>
                <br />
                {q.answer}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProblemEntryScreen;