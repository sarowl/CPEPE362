import { useState } from "react";
import { ArrowRight, Loader2, Monitor, Plus, ChevronDown, Logs } from "lucide-react";
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
        id: v.id,
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
          onSubmit(enrichedProblem, result.diagnoses, selectedVehicle);
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
          onSubmit(buildContext(updated), result.diagnoses, selectedVehicle);
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

        {/* Header */}
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

        {/* Follow-up question */}
        {currentQuestion && !loading && (
          <p className="text-sm font-medium">{currentQuestion}</p>
        )}

        {/* Loading spinner */}
        {loading && (
          <div className="flex justify-center">
            <Loader2 className="animate-spin" />
          </div>
        )}

        {/* Errors */}
        {error && <p className="text-sm text-red-500">{error}</p>}
        {garageFetchError && (
          <p className="text-xs text-amber-500 text-center">{garageFetchError}</p>
        )}

        {/* ── Redesigned input box ── */}
        <div className="rounded-2xl border border-border bg-background shadow-sm overflow-hidden">

        <div className="flex justify-center">
          <button
            onClick={handleOpenGarage}
            disabled={garageLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium shadow-sm"
          >
            {garageLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
            ) : (
              <Logs className="w-4 h-4" />
            )}
            {garageLoading ? "Loading..." : "Select Vehicle"}
          </button>
        </div>

        <GarageModal
          isOpen={isGarageOpen}
          onClose={() => setIsGarageOpen(false)}
          cars={garageVehicles}
          onSelect={(car) => setSelectedVehicle(car)}
          isLoading={garageLoading}
        />

        {/* Q&A history */}
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
    </div>
  );
};

export default ProblemEntryScreen;