import { NextResponse } from 'next/server';

// ─── Ollama Config ────────────────────────────────────────────────────────────
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL    = process.env.OLLAMA_MODEL    || "gemma4:e2b";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function safeJsonParse(rawText: string) {
  let clean = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const jsonMatch = clean.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) clean = jsonMatch[0];
  try {
    return JSON.parse(clean);
  } catch (e) {
    console.error("Failed to parse JSON. Raw output:", rawText);
    throw new Error("Invalid JSON format from local LLM");
  }
}

/**
 * Calls the local Ollama instance.
 * Ollama POST /api/generate → { response: string }
 */
async function callOllama(prompt: string, timeoutMs = 60000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.1 },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ollama error ${res.status}: ${text}`);
    }

    const data = await res.json();
    return data.response as string;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Retry wrapper — mirrors the original generateWithRetry logic.
 * Retries on network errors or Ollama 503/429.
 */
async function generateWithRetry(prompt: string, retries = 3): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      return await callOllama(prompt);
    } catch (error: any) {
      const isTransient =
        error.name === "AbortError" ||
        error.message?.includes("503") ||
        error.message?.includes("429");

      if (isTransient && i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        continue;
      }
      throw error;
    }
  }
  throw new Error("All retries exhausted");
}

// ─── System instruction (unchanged from original) ─────────────────────────────
const systemInstruction = `You are "Autobot", an expert automotive diagnostic assistant.
Your job is to help identify vehicle problems based on user descriptions.
Rules:
- Focus only on automotive-related causes.
- Prioritize the most common and likely causes first.
- Keep explanations simple and easy to understand.
- ALWAYS respond with raw JSON only. No markdown. No explanation outside the JSON.`;

// ─── Route Handler ────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { callType, initialProblem, qaHistory } = body;

    // ── Call 0: Validate Input ──────────────────────────────────────────────
    if (callType === "validate-input") {
      const prompt = `${systemInstruction}

Determine if this problem is automotive-related: "${initialProblem}"

Respond with ONLY this JSON, no other text:
{"isValid": true, "reason": "explanation here"}

If not automotive: {"isValid": false, "reason": "explanation here"}`;

      const raw      = await generateWithRetry(prompt);
      const response = safeJsonParse(raw);
      return NextResponse.json({ type: "validation", ...response });
    }

    // ── Call 1: Get Questions ───────────────────────────────────────────────
    if (callType === "get-questions") {
      const prompt = `${systemInstruction}

A user reports this vehicle problem: "${initialProblem}"

Generate exactly 4 short, specific follow-up questions to narrow down the diagnosis.

Respond with ONLY this JSON, no other text:
{"questions": ["question 1", "question 2", "question 3", "question 4"]}`;

      const raw      = await generateWithRetry(prompt);
      const response = safeJsonParse(raw);
      return NextResponse.json({ type: "questions", questions: response.questions });
    }

    // ── Call 2: Get Diagnosis ───────────────────────────────────────────────
    if (callType === "get-diagnosis") {
      const historyText = qaHistory
        .map((qa: any) => `Q: ${qa.question}\nA: ${qa.answer}`)
        .join("\n");

      const prompt = `${systemInstruction}

A user reports this vehicle problem: "${initialProblem}"
Additional context from follow-up questions:
${historyText}

Return exactly 4 diagnoses ranked from most to least likely.

Respond with ONLY this JSON, no other text:
{
  "diagnoses": [
    {"rank": 1, "title": "Issue Name", "likelihood": "High/Medium/Low", "description": "brief explanation", "urgency": "High/Medium/Low"},
    {"rank": 2, "title": "Issue Name", "likelihood": "High/Medium/Low", "description": "brief explanation", "urgency": "High/Medium/Low"},
    {"rank": 3, "title": "Issue Name", "likelihood": "High/Medium/Low", "description": "brief explanation", "urgency": "High/Medium/Low"},
    {"rank": 4, "title": "Issue Name", "likelihood": "High/Medium/Low", "description": "brief explanation", "urgency": "High/Medium/Low"}
  ]
}`;

      const raw      = await generateWithRetry(prompt);
      const response = safeJsonParse(raw);
      return NextResponse.json({ type: "diagnosis", diagnoses: response.diagnoses });
    }

    return NextResponse.json({ error: "Unknown callType" }, { status: 400 });

  } catch (error: any) {
    console.error("Local LLM Error (diagnostic):", error);
    return NextResponse.json(
      { error: "Local model busy or returned invalid response. Try again." },
      { status: 500 }
    );
  }
}