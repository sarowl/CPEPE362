// src/app/api/problem_entry_screen/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// 1. Correct Initialization
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { callType, initialProblem, qaHistory } = body;

    // 2. Select the model (Use the latest version available in your tier)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash" 
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

        Diagnostic Guidelines:
        - Vibrations or wobble at speed → prioritize wheels, tires, suspension, alignment, and balancing.
        - Noises (knocking, ticking) → consider engine, valvetrain, or exhaust.
        - Difficulty starting → consider battery, starter, fuel system.
        - Overheating → consider coolant system, radiator, thermostat.
        - Braking issues → consider brake pads, rotors, fluid.

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

    // ── Call 1: Get Questions ───────────────────────────────────────────
    if (callType === "get-questions") {
      const prompt = `${systemInstruction}\n\nThe user's car problem: "${initialProblem}". Generate exactly 4 short clarifying questions.`;
      
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          // The standard SDK expects the schema in this format
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
        },
      });

      const response = JSON.parse(result.response.text());
      return NextResponse.json({ type: "questions", questions: response.questions });
    }

    // ── Call 2: Get Diagnosis ───────────────────────────────────────────
    if (callType === "get-diagnosis") {
      const historyText = qaHistory.map((qa: any) => `Q: ${qa.question}\nA: ${qa.answer}`).join("\n");
      const prompt = `${systemInstruction}\n\nProblem: "${initialProblem}"\nContext:\n${historyText}\n\nReturn the top 4 most likely diagnoses.`;

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
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
        }
      });

      const response = JSON.parse(result.response.text());
      return NextResponse.json({ type: "diagnosis", diagnoses: response.diagnoses });
    }

    return NextResponse.json({ error: "Unknown callType" }, { status: 400 });

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // If you get a 400 here, it's likely a Model Name or API Key issue
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}