// ============================================================
//
// POST endpoint: generates a step-by-step repair procedure using Gemini AI.
// Input: selected diagnosis + vehicle info + problem context
// Uses: REPAIR_MODE_API_KEY env var (gemini-3.1-flash-lite-preview model)
// Returns: structured JSON with tools, parts, and ordered repair steps.
// Called once per repair session; result is cached in RepairModeScreen
// to avoid redundant calls if user navigates back from EscalationScreen.
// ============================================================
// src/app/api/repair_procedure/route.ts
import { NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.REPAIR_MODE_API_KEY || "");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { problemContext, diagnosis, vehicle } = body;

    if (!diagnosis) {
      return NextResponse.json({ error: "Missing diagnosis" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite-preview",
    });
//compliance
    const vehicleInfo = vehicle
      ? `Vehicle: ${vehicle.year} ${vehicle.model}`
      : "Vehicle: Unknown";

    const prompt = `
      You are "Autobot", an expert automotive repair assistant.

      ${vehicleInfo}

      A vehicle has been diagnosed with the following issue:
      - Diagnosis: ${diagnosis.title}
      - Description: ${diagnosis.description}
      - Urgency: ${diagnosis.urgency}

      Additional context from the user:
      ${problemContext ?? "No additional context provided."}

      Generate a clear, ordered step-by-step repair procedure specific to the
      ${vehicle ? `${vehicle.year} ${vehicle.model}` : "vehicle"} and this diagnosis.

      Rules:
      - Tailor steps to the specific make, model, and year where procedures differ
        (e.g. access panels, torque specs, part numbers, known quirks for that vehicle).
      - Each step must have a short title (3–6 words) and a clear instruction (1–3 sentences).
      - Steps must be in the correct order a mechanic would follow.
      - Include safety warnings inside the instruction text where relevant (e.g. "Ensure the engine is cool before proceeding.").
      - Include torque specs or measurements inside the instruction text where relevant.
      - Be specific to the diagnosed issue — do not give generic advice.
      - Use plain language that a DIY mechanic can understand.
      - Generate steps depending on the complexity of the diagnosis make it clear and actionable.

      Also generate:
      - tools: A list of specific tools required for this repair on this vehicle (e.g. "10mm socket wrench", "brake caliper wind-back tool"). Only list tools that are genuinely required beyond common hand tools. Tailor to the vehicle where relevant (e.g. special sockets or trim removal tools specific to the make/model).
      - parts: A list of replacement parts or consumables needed (e.g. "Front brake pads (check OEM spec for ${vehicle?.model ?? "this vehicle"})", "Brake fluid DOT 4 — 500ml"). Include specs, sizes, or OEM references where relevant to the specific vehicle.
      - postRepairNote: A 2–4 sentence post-repair checklist specific to this diagnosis. Tell the mechanic exactly what to verify, test, or inspect after completing the repair before returning the vehicle to normal use.
      - nextMaintenance: The single most relevant follow-up maintenance item for this repair. Include a short label (e.g. "Brake fluid flush") and a realistic service interval (e.g. "30,000 mi" or "12 months").
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
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
            postRepairNote: {
              type: SchemaType.STRING,
            },
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

    const response = JSON.parse(result.response.text());
    return NextResponse.json({
      tools:           response.tools,
      parts:           response.parts,
      steps:           response.steps,
      postRepairNote:  response.postRepairNote,
      nextMaintenance: response.nextMaintenance,
    });

  } catch (error: any) {
    console.error("Repair procedure API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}