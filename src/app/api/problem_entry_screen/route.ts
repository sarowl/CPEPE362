// ============================================================
// api/problem_entry_screen/route.ts — IMPORTED FROM Folder_B
//
// POST endpoint: drives the AI problem entry and Q&A flow using Gemini AI.
// Two call types:
//  - "qa": generates follow-up questions based on the initial problem description
//  - "diagnose": analyzes problem + Q&A answers to return diagnosis options
// Uses: GEMINI_API_KEY env var (gemini-3.1-flash-lite-preview model)
// Includes retry logic for Gemini 503 errors (up to 3 retries).
// ============================================================
// src/app/api/problem_entry_screen/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Helper function to handle transient 503 errors from Gemini.
 * It will retry up to 3 times with a short delay.
 */
async function generateWithRetry(model: any, content: any, config: any, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await model.generateContent({
        contents: content,
        generationConfig: config,
      });
    } catch (error: any) {
      const is503 = error.status === 503 || error.message?.includes("503");
      if (is503 && i < retries - 1) {
        console.warn(`Gemini 503 (Busy) detected. Retrying attempt ${i + 1}...`);
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

    // Note: If 3.1-flash-lite-preview continues to be unstable, 
    // consider switching to "gemini-1.5-flash" for production stability.
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.1-flash-lite-preview" 
    });

    const systemInstruction = `
        You are "Autobot", an expert automotive diagnostic assistant.

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
      const prompt = `Determine if the following user input is related to a car, vehicle, truck, motorcycle, or any automotive problem.

User input: "${initialProblem}"

Respond with a JSON object. If it IS automotive-related, set isValid to true and reason to an empty string. If it is NOT automotive-related, set isValid to false and set reason to a short friendly message explaining that Autobot only handles car and vehicle issues.`;

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
      const response = JSON.parse(result.response.text());
      return NextResponse.json({ type: "validation", isValid: response.isValid, reason: response.reason });
    }

    // ── Call 1: Get Questions ───────────────────────────────────────────
    if (callType === "get-questions") {
      const prompt = `${systemInstruction}\n\nThe user's car problem: "${initialProblem}". Generate exactly 4 short clarifying questions.`;
      
      const config = {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            questions: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
          },
          required: ["questions"],
        },
      };

      const result = await generateWithRetry(model, [{ role: "user", parts: [{ text: prompt }] }], config);
      const response = JSON.parse(result.response.text());
      return NextResponse.json({ type: "questions", questions: response.questions });
    }

    // ── Call 2: Get Diagnosis ───────────────────────────────────────────
    if (callType === "get-diagnosis") {
      const historyText = qaHistory.map((qa: any) => `Q: ${qa.question}\nA: ${qa.answer}`).join("\n");
      const prompt = `${systemInstruction}\n\nProblem: "${initialProblem}"\nContext:\n${historyText}\n\nReturn the top 4 most likely diagnoses.`;

      const config = {
        temperature: 0.1, // Fixed the syntax error here
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
      const response = JSON.parse(result.response.text());
      return NextResponse.json({ type: "diagnosis", diagnoses: response.diagnoses });
    }

    return NextResponse.json({ error: "Unknown callType" }, { status: 400 });

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    const status = error.status || 500;
    const message = status === 503 
      ? "The AI is currently under high demand. Please wait a moment and try again." 
      : error.message;
      
    return NextResponse.json({ error: message }, { status });
  }
}