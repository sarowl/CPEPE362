import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

function safeJsonParse(rawText: string) {
  let clean = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const jsonMatch = clean.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) clean = jsonMatch[0];
  try {
    return JSON.parse(clean);
  } catch (e) {
    console.error("Failed to parse JSON. Raw output:", rawText);
    throw new Error("Invalid JSON format from AI");
  }
}

async function generateWithRetry(model: any, content: any, config: any, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await model.generateContent({ contents: content, generationConfig: config });
    } catch (error: any) {
      const isTransientError = error.status === 503 || error.status === 429;
      if (isTransientError && i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        continue;
      }
      throw error;
    }
  }
}

const systemInstruction = `You are "Autobot", an expert automotive diagnostic assistant.
Your job is to help identify vehicle problems based on user descriptions.
Rules:
- Focus only on automotive-related causes.
- Prioritize the most common and likely causes first.
- Keep explanations simple and easy to understand.
- ALWAYS respond with raw JSON only. No markdown. No explanation outside the JSON.`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { callType, initialProblem, qaHistory } = body;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const baseConfig = { temperature: 0.1 };

    // ── Call 0: Validate Input ──────────────────────────────────────
    if (callType === "validate-input") {
      const prompt = `${systemInstruction}

Determine if this problem is automotive-related: "${initialProblem}"

Respond with ONLY this JSON, no other text:
{"isValid": true, "reason": "explanation here"}

If not automotive: {"isValid": false, "reason": "explanation here"}`;

      const result = await generateWithRetry(model, [{ role: "user", parts: [{ text: prompt }] }], baseConfig);
      const response = safeJsonParse(result.response.text());
      return NextResponse.json({ type: "validation", ...response });
    }

    // ── Call 1: Get Questions ───────────────────────────────────────
    if (callType === "get-questions") {
      const prompt = `${systemInstruction}

A user reports this vehicle problem: "${initialProblem}"

Generate exactly 4 short, specific follow-up questions to narrow down the diagnosis.

Respond with ONLY this JSON, no other text:
{"questions": ["question 1", "question 2", "question 3", "question 4"]}`;

      const result = await generateWithRetry(model, [{ role: "user", parts: [{ text: prompt }] }], baseConfig);
      const response = safeJsonParse(result.response.text());
      return NextResponse.json({ type: "questions", questions: response.questions });
    }

    // ── Call 2: Get Diagnosis ───────────────────────────────────────
    if (callType === "get-diagnosis") {
      const historyText = qaHistory.map((qa: any) => `Q: ${qa.question}\nA: ${qa.answer}`).join("\n");
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

      const result = await generateWithRetry(model, [{ role: "user", parts: [{ text: prompt }] }], baseConfig);
      const response = safeJsonParse(result.response.text());
      return NextResponse.json({ type: "diagnosis", diagnoses: response.diagnoses });
    }

    return NextResponse.json({ error: "Unknown callType" }, { status: 400 });

  } catch (error: any) {
    console.error("Gemma API Error:", error);
    return NextResponse.json({ error: "Service busy or invalid response. Try again." }, { status: 500 });
  }
}