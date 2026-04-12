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
  onSubmit: (problem: string, diagnoses: any[], vehicle: Vehicle | null) => void; // ← vehicle added
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

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            disabled={loading}
            placeholder={
              phase === "initial"
                ? "e.g. grinding noise when braking"
                : "Your answer"
            }
            className="w-full pl-10 pr-12 py-3 border rounded-lg"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
          </button>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleOpenGarage}
            className="flex items-center gap-2 text-sm"
          >
            {garageLoading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Logs className="h-4 w-4" />
            }
            Browse Garage
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