import { NextResponse } from "next/server";

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
 * Retry wrapper with timeout awareness — mirrors the original logic.
 */
async function generateWithRetry(prompt: string, retries = 3): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      return await callOllama(prompt);
    } catch (error: any) {
      const isRetryable =
        error.name === "AbortError" ||          // timeout
        error.message?.includes("503") ||
        error.message?.includes("429");

      if (isRetryable && i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        continue;
      }
      throw error;
    }
  }
  throw new Error("All retries exhausted");
}

// ─── Route Handler ────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { problemContext, diagnosis, vehicle } = body;

    if (!diagnosis) {
      return NextResponse.json({ error: "Missing diagnosis" }, { status: 400 });
    }

    const vehicleInfo = vehicle
      ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
      : "Unknown Vehicle";

    const prompt = `You are "Autobot", an expert automotive repair assistant.
ALWAYS respond with raw JSON only. No markdown. No explanation outside the JSON.

Vehicle: ${vehicleInfo}
Diagnosis: ${diagnosis.title}
Description: ${diagnosis.description}
Urgency: ${diagnosis.urgency}
Additional context: ${problemContext ?? "None provided."}

Generate a step-by-step repair procedure for this specific vehicle and diagnosis.

Rules:
- Tailor steps to the specific make, model, and year (access panels, torque specs, known quirks).
- Each step: short title (3-6 words) + clear instruction (1-3 sentences).
- Steps must be in correct mechanic order.
- Include safety warnings inline where relevant.
- Include torque specs or measurements inline where relevant.
- Be specific to the diagnosed issue — no generic advice.
- Use plain DIY mechanic language.
- Only list tools genuinely required beyond common hand tools.
- Include part specs, sizes, or OEM references where relevant.

Respond with ONLY this JSON structure, no other text:
{
  "tools": ["tool 1", "tool 2"],
  "parts": ["part with spec 1", "part with spec 2"],
  "steps": [
    {"id": 1, "title": "Step Title Here", "instruction": "Clear instruction here."},
    {"id": 2, "title": "Step Title Here", "instruction": "Clear instruction here."}
  ],
  "postRepairNote": "2-4 sentences on what to verify after repair.",
  "nextMaintenance": {
    "label": "Follow-up maintenance item",
    "interval": "e.g. 30,000 mi or 12 months"
  }
}`;

    const raw          = await generateWithRetry(prompt);
    const responseData = safeJsonParse(raw);
    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error("Local LLM Error (repair):", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate repair procedure" },
      { status: 500 }
    );
  }
}