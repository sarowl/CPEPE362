// src/app/api/repair_procedure/route.ts
import { NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.REPAIR_MODE_API_KEY || "");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { problemContext, diagnosis } = body;

    if (!diagnosis) {
      return NextResponse.json({ error: "Missing diagnosis" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite-preview",
    });

    const prompt = `
      You are "Autobot", an expert automotive repair assistant.

      A vehicle has been diagnosed with the following issue:
      - Diagnosis: ${diagnosis.title}
      - Description: ${diagnosis.description}
      - Urgency: ${diagnosis.urgency}

      Additional context from the user:
      ${problemContext ?? "No additional context provided."}

      Generate a clear, ordered step-by-step repair procedure for this specific diagnosis.

      Rules:
      - Each step must have a short title (3–6 words) and a clear instruction (1–3 sentences).
      - Steps must be in the correct order a mechanic would follow.
      - Include safety warnings inside the instruction text where relevant (e.g. "Ensure the engine is cool before proceeding.").
      - Include torque specs or measurements inside the instruction text where relevant.
      - Be specific to the diagnosed issue — do not give generic advice.
      - Use plain language that a DIY mechanic can understand.
      - Generate steps depending on the complexity of the diagnosis make it clear and actionable.

      Also generate:
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
          required: ["steps", "postRepairNote", "nextMaintenance"],
        },
      },
    });

    const response = JSON.parse(result.response.text());
    return NextResponse.json({
      steps:            response.steps,
      postRepairNote:   response.postRepairNote,
      nextMaintenance:  response.nextMaintenance,
    });

  } catch (error: any) {
    console.error("Repair procedure API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}