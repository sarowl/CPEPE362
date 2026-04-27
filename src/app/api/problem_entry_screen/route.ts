import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

function safeJsonParse(rawText: string) {
  const cleanText = rawText.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Failed to parse JSON. Raw output:", rawText);
    throw new Error("Invalid JSON format from AI");
  }
}

async function generateWithRetry(model: any, content: any, config: any, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await model.generateContent({
        contents: content,
        generationConfig: config,
      });
    } catch (error: any) {
      const isTransientError = error.status === 503 || error.status === 429;
      if (isTransientError && i < retries - 1) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { callType, initialProblem, qaHistory } = body;

    const model = genAI.getGenerativeModel({ model: "gemma-4-31b-it" });

    const systemInstruction = `You are "Autobot", an expert automotive diagnostic assistant.

        Your job is to:
        - Help identify vehicle problems based on user descriptions.
        - Ask clear, short, and relevant follow-up questions.
        - Provide practical, realistic diagnoses based on symptoms.

        Rules:
        - Focus only on automotive-related causes. Ignore unrelated domains.
        - Prioritize the most common and likely causes first.
        - Do not guess wildly. Base reasoning on given symptoms and context.
        - Keep explanations simple and easy to understand.

        Question Behavior:
        - Ask exactly 4 questions.
        - Questions must be short, specific, and help narrow down the issue.
        - Avoid repeating information already given.

        Diagnosis Behavior:
        - Return the top 4 most likely causes.
        - Rank from most likely (1) to least likely (4).
        - Be concise but informative.
        - Include urgency based on safety risk (Low, Medium, High).

        Never:
        - Suggest unrelated systems (e.g., ignition for vibration unless clearly relevant).
        - Provide vague answers like "could be many things" without narrowing down.

        Always aim to guide the user toward a clear next step.
    `;

    // ── Call 0: Validate Input ──────────────────────────────────────────
    if (callType === "validate-input") {
      const prompt = `Determine if this is automotive-related: "${initialProblem}". Respond in JSON with "isValid" and "reason".`;
      const config = {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            isValid: { type: SchemaType.BOOLEAN },
            reason: { type: SchemaType.STRING },
          },
          required: ["isValid", "reason"],
        },
      };

      const result = await generateWithRetry(model, [{ role: "user", parts: [{ text: prompt }] }], config);
      const response = safeJsonParse(result.response.text()); // Use helper
      return NextResponse.json({ type: "validation", ...response });
    }

    // ── Call 1: Get Questions ───────────────────────────────────────────
    if (callType === "get-questions") {
      const prompt = `${systemInstruction}\n\nProblem: "${initialProblem}". Generate 4 questions.`;
      const config = {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            questions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          },
          required: ["questions"],
        },
      };

      const result = await generateWithRetry(model, [{ role: "user", parts: [{ text: prompt }] }], config);
      const response = safeJsonParse(result.response.text()); // Use helper
      return NextResponse.json({ type: "questions", questions: response.questions });
    }

    // ── Call 2: Get Diagnosis ───────────────────────────────────────────
    if (callType === "get-diagnosis") {
      const historyText = qaHistory.map((qa: any) => `Q: ${qa.question}\nA: ${qa.answer}`).join("\n");
      const prompt = `${systemInstruction}\n\nProblem: "${initialProblem}"\nContext:\n${historyText}\n\nRank top 4 diagnoses.`;
      const config = {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            diagnoses: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  rank: { type: SchemaType.NUMBER },
                  title: { type: SchemaType.STRING },
                  likelihood: { type: SchemaType.STRING },
                  description: { type: SchemaType.STRING },
                  urgency: { type: SchemaType.STRING }
                },
                required: ["rank", "title", "likelihood", "description", "urgency"]
              }
            }
          },
          required: ["diagnoses"]
        }
      };

      const result = await generateWithRetry(model, [{ role: "user", parts: [{ text: prompt }] }], config);
      const response = safeJsonParse(result.response.text()); // Use helper
      return NextResponse.json({ type: "diagnosis", diagnoses: response.diagnoses });
    }

    return NextResponse.json({ error: "Unknown callType" }, { status: 400 });

  } catch (error: any) {
    console.error("Gemma API Error:", error);
    return NextResponse.json({ error: "Service busy or invalid response. Try again." }, { status: 500 });
  }
}