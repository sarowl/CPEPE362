//src\components\AIRepairFlow\Screens\ProblemEntryScreen.tsx
import { useState } from "react";
import { Search, ArrowRight, Loader2 } from "lucide-react";

interface QA {
  question: string;
  answer: string;
}

type GeminiResult =
  | { type: "questions"; questions: string[] }
  | { type: "diagnosis"; diagnoses: any[] };

interface ProblemEntryScreenProps {
  onSubmit: (problem: string, diagnoses: any[]) => void;
}

async function getNextStep(
  callType: "get-questions" | "get-diagnosis",
  initialProblem: string,
  qaHistory: QA[]
): Promise<GeminiResult> {
  const res = await fetch("/api/problem_entry_screen", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callType, initialProblem, qaHistory }),
  });

  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  return await res.json();
}

const ProblemEntryScreen = ({ onSubmit }: ProblemEntryScreenProps) => {
  const [phase, setPhase] = useState<"initial" | "followup">("initial");
  const [initialProblem, setInitialProblem] = useState("");
  const [currentInput, setCurrentInput] = useState("");
  const [followUpQuestion, setFollowUpQuestion] = useState<string | null>(null);
  const [qaHistory, setQaHistory] = useState<QA[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildContext = (history: QA[]) => {
    const lines = [`Problem: ${initialProblem}`];
    history.forEach((qa) => {
      lines.push(`Q: ${qa.question}`);
      lines.push(`A: ${qa.answer}`);
    });
    return lines.join("\n");
  };

  const handleSubmit = async () => {
    const trimmed = currentInput.trim();
    if (!trimmed || isThinking) return;

    setError(null);

    if (phase === "initial") {
      setInitialProblem(trimmed);
      setCurrentInput("");
      setIsThinking(true);

      try {
        const result = await getNextStep("get-questions", trimmed, []);
        if (result.type === "diagnosis") {
          onSubmit(`Problem: ${trimmed}`, result.diagnoses);
        } else {
          setFollowUpQuestion(result.questions[0]);
          setPhase("followup");
        }
      } catch {
        setError("Couldn't reach the AI. Please try again.");
      } finally {
        setIsThinking(false);
      }
      return;
    }

    const updatedHistory: QA[] = [
      ...qaHistory,
      { question: followUpQuestion!, answer: trimmed },
    ];
    setQaHistory(updatedHistory);
    setCurrentInput("");
    setFollowUpQuestion(null);
    setIsThinking(true);

    try {
      const result = await getNextStep("get-diagnosis", initialProblem, updatedHistory);
      if (result.type === "diagnosis") {
        onSubmit(buildContext(updatedHistory), result.diagnoses);
      } else {
        setFollowUpQuestion(result.questions[0]);
      }
    } catch {
      setError("Couldn't reach the AI. Please try again.");
    } finally {
      setIsThinking(false);
    }
  };

  const placeholder =
    phase === "initial"
      ? "e.g. My car makes a grinding noise when braking…"
      : "Your answer…";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            {phase === "initial" ? "What's the problem?" : "A quick follow-up"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {phase === "initial"
              ? "Describe what's happening in your own words"
              : "Help us narrow it down"}
          </p>
        </div>

        {followUpQuestion && !isThinking && (
          <div className="animate-slide-up">
            <p className="text-sm text-accent-foreground mb-3 font-medium">
              {followUpQuestion}
            </p>
          </div>
        )}

        {isThinking && (
          <div className="flex items-center justify-center gap-3 py-4">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-primary thinking-pulse" style={{ animationDelay: "0s" }} />
              <div className="w-2 h-2 rounded-full bg-primary thinking-pulse" style={{ animationDelay: "0.3s" }} />
              <div className="w-2 h-2 rounded-full bg-primary thinking-pulse" style={{ animationDelay: "0.6s" }} />
            </div>
            <span className="text-sm text-muted-foreground">Analyzing…</span>
          </div>
        )}

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder={placeholder}
            className="w-full bg-input border border-border rounded-xl pl-12 pr-14 py-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
            disabled={isThinking}
          />
          <button
            onClick={handleSubmit}
            disabled={!currentInput.trim() || isThinking}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground p-2.5 rounded-lg disabled:opacity-30 transition-opacity"
          >
            {isThinking ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ArrowRight className="h-5 w-5" />
            )}
          </button>
        </div>

        {qaHistory.length > 0 && (
          <div className="space-y-2">
            {qaHistory.map((qa, i) => (
              <div key={i} className="text-xs text-muted-foreground">
                <span className="text-accent-foreground">{qa.question}</span>
                <br />
                <span className="font-mono">{qa.answer}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProblemEntryScreen;