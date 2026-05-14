import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.REPAIR_MODE_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

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

async function generateWithTimeout(model: any, contents: any, config: any, timeoutMs = 25000) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Request timed out")), timeoutMs)
  );
  const generatePromise = model.generateContent({ contents, generationConfig: config });
  return Promise.race([generatePromise, timeoutPromise]);
}

async function generateWithRetry(model: any, contents: any, config: any, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await generateWithTimeout(model, contents, config);
    } catch (error: any) {
      const isRetryable = error.status === 503 || error.status === 429 || error.message === "Request timed out";
      if (isRetryable && i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        continue;
      }
      throw error;
    }
  }
}

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

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const vehicleInfo = vehicle
      ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
      : "Unknown Vehicle";

    // Get current date in YYYY-MM-DD format
    const today = new Date();
    const currentDateStr = today.toISOString().split('T')[0];
    
    // Calculate maintenance date (12 months from today)
    const nextYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
    const maintenanceDateStr = nextYear.toISOString().split('T')[0];

    const prompt = `You are "Autobot", an expert automotive repair assistant.
ALWAYS respond with raw JSON only. No markdown. No explanation outside the JSON.

IMPORTANT: Today's date is ${currentDateStr}. Use this for all date calculations.

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
    "label": "Follow-up maintenance item (must be specific and non-empty)",
    "interval": "e.g. 30,000 mi or 12 months",
    "date": "${maintenanceDateStr} or a specific YYYY-MM-DD date based on the recommended interval"
  }
}`;

    const result = await generateWithRetry(
      model,
      [{ role: "user", parts: [{ text: prompt }] }],
      { temperature: 0.1 }
    );

    const responseData = safeJsonParse((result as any).response.text());
    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error("Repair procedure API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate repair procedure" },
      { status: 500 }
    );
  }
}