// ============================================================
// POST endpoint: generates a step-by-step repair procedure using Gemma 4 AI.
// Input: selected diagnosis + vehicle info + problem context
// Uses: REPAIR_MODE_API_KEY env var (gemma-4-31b model)
// ============================================================
// src/app/api/repair_procedure/route.ts
import { NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const API_KEY = process.env.REPAIR_MODE_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

export async function POST(req: Request) {
  try {
    if (!API_KEY) {
      return NextResponse.json({ error: "API Key not configured" }, { status: 500 });
    }

    const body = await req.json();
    const { problemContext, diagnosis, vehicle } = body;

    if (!diagnosis) {
      return NextResponse.json({ error: "Missing diagnosis" }, { status: 400 });
    }

    // Initialize Gemma 4 31B
    const model = genAI.getGenerativeModel({
      model: "gemma-4-31b",
      systemInstruction: 'You are "Autobot", an expert automotive repair assistant. Your goal is to provide highly specific, safe, and actionable repair guidance for DIY mechanics.',
    });

    const vehicleInfo = vehicle
      ? `Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}`
      : "Vehicle: Unknown";

    const prompt = `
      ${vehicleInfo}

      A vehicle has been diagnosed with the following issue:
      - Diagnosis: ${diagnosis.title}
      - Description: ${diagnosis.description}
      - Urgency: ${diagnosis.urgency}

      Additional context from the user:
      ${problemContext ?? "No additional context provided."}

      Generate a clear, ordered step-by-step repair procedure specific to this vehicle and diagnosis.

      Rules:
      - Tailor steps to the specific make, model, and year (access panels, torque specs, known quirks).
      - Each step must have a short title (3–6 words) and a clear instruction (1–3 sentences).
      - Include safety warnings (e.g., "Ensure engine is cool") and torque specs inside the instructions.
      - List specific tools (e.g., "10mm deep socket") and parts/consumables (e.g., "DOT 4 Brake Fluid").
      - Provide a 2-4 sentence post-repair checklist.
      - Provide a follow-up maintenance item with a realistic interval.
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1, // Low temperature for technical accuracy
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            tools: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
            parts: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
            steps: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  id:          { type: SchemaType.NUMBER },
                  title:       { type: SchemaType.STRING },
                  instruction: { type: SchemaType.STRING },
                },
                required: ["id", "title", "instruction"],
              },
            },
            postRepairNote: { type: SchemaType.STRING },
            nextMaintenance: {
              type: SchemaType.OBJECT,
              properties: {
                label:    { type: SchemaType.STRING },
                interval: { type: SchemaType.STRING },
              },
              required: ["label", "interval"],
            },
          },
          required: ["tools", "parts", "steps", "postRepairNote", "nextMaintenance"],
        },
      },
    });

    const responseText = result.response.text();
    const responseData = JSON.parse(responseText);

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error("Repair procedure API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate repair procedure" }, 
      { status: 500 }
    );
  }
}