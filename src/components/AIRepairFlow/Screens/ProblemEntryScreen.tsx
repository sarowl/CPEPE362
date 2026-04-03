// src/components/AIRepairFlow/Screens/ProblemEntryScreen.tsx
import { useState } from "react";
import { Search, ArrowRight, Loader2 } from "lucide-react";

interface QA {
  question: string;
  answer: string;
}

type GeminiResult =
  | { type: "questions"; questions: string[] }
  | { type: "diagnosis"; diagnoses: any[] }
  | { type: "validation"; isValid: boolean; reason: string };

interface ProblemEntryScreenProps {
  onSubmit: (problem: string, diagnoses: any[]) => void;
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

  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  return await res.json();
}

const ProblemEntryScreen = ({ onSubmit }: ProblemEntryScreenProps) => {
  const [phase, setPhase] = useState<"initial" | "followup" | "diagnosing">("initial");
  const [initialProblem, setInitialProblem] = useState("");
  const [currentInput, setCurrentInput] = useState("");

  // Stores all 4 questions returned from the first API call
  const [questions, setQuestions] = useState<string[]>([]);
  // Question index
  const [questionIndex, setQuestionIndex] = useState(0);
  // Question-answer history 
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
      setCurrentInput("");
      setIsThinking(true);

      try {
        // ── Step 1: Validate that the input is automotive-related ──────
        const validation = await getNextStep("validate-input", trimmed, []);

        if (validation.type === "validation" && !validation.isValid) {
          // Reject the input and show the AI's reason to the user
          setError("Please describe a car or vehicle-related problem.");
          setIsThinking(false);
          return;
        }

        // ── Step 2: Input is valid — fetch follow-up questions ─────────
        setInitialProblem(trimmed);
        const result = await getNextStep("get-questions", trimmed, []);

        if (result.type === "diagnosis") {
          onSubmit(`Problem: ${trimmed}`, result.diagnoses);
        } else if (result.type === "questions") {
          setQuestions(result.questions);
          setQuestionIndex(0);
          setPhase("followup");
        }
      } catch {
        setError("Couldn't reach the AI. Please try again.");
      } finally {
        setIsThinking(false);
      }
      return;
    }

    // Follow up questions
    if (phase === "followup") {
      const currentQuestion = questions[questionIndex];
      const updatedHistory: QA[] = [
        ...qaHistory,
        { question: currentQuestion, answer: trimmed },
      ];

      setQaHistory(updatedHistory);
      setCurrentInput("");

      const nextIndex = questionIndex + 1;

      if (nextIndex < questions.length) {
        setQuestionIndex(nextIndex);
        return;
      }

      // Get diagnosis
      setPhase("diagnosing");
      setIsThinking(true);

      try {
        const result = await getNextStep("get-diagnosis", initialProblem, updatedHistory);

        if (result.type === "diagnosis") {
          onSubmit(buildContext(updatedHistory), result.diagnoses);
        } else {
          setError("Unexpected response from AI. Please try again.");
          setPhase("followup");
          setQuestionIndex(questions.length - 1); 
        }
      } catch {
        setError("Couldn't reach the AI. Please try again.");
        setPhase("followup");
        setQuestionIndex(questions.length - 1);
      } finally {
        setIsThinking(false);
      }
    }
  };

  const currentQuestion =
    phase === "followup" && questions.length > 0
      ? questions[questionIndex]
      : null;

  const placeholder =
    phase === "initial"
      ? "e.g. My car makes a grinding noise when braking…"
      : "Your answer…";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-lg space-y-8">

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            {phase === "initial" ? "What's the problem?" : "A quick follow-up"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {phase === "initial"
              ? "Describe what's happening in your own words"
              : `Question ${questionIndex + 1} of ${questions.length}`}
          </p>
        </div>

        {/* Current follow-up question */}
        {currentQuestion && !isThinking && (
          <div className="animate-slide-up">
            <p className="text-sm text-accent-foreground mb-3 font-medium">
              {currentQuestion}
            </p>
          </div>
        )}

        {/* Thinking indicator */}
        {isThinking && (
          <div className="flex items-center justify-center gap-3 py-4">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-primary thinking-pulse" style={{ animationDelay: "0s" }} />
              <div className="w-2 h-2 rounded-full bg-primary thinking-pulse" style={{ animationDelay: "0.3s" }} />
              <div className="w-2 h-2 rounded-full bg-primary thinking-pulse" style={{ animationDelay: "0.6s" }} />
            </div>
            <span className="text-sm text-muted-foreground">
              {phase === "diagnosing" ? "Diagnosing…" : "Analyzing…"}
            </span>
          </div>
        )}

        {/* Error / validation rejection */}
        {error && (
          <div className="text-red-600 rounded-xl px-4 py-3">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Input */}
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

        {/* Q&A history recap */}
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