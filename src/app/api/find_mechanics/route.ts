// src/app/api/find_mechanics/route.ts
import { NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.REPAIR_MODE_API_KEY || "");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { lat, lng } = body;

    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json(
        { error: "Missing or invalid coordinates. Expected { lat: number, lng: number }." },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const prompt = `
      You are "Autobot", an expert automotive repair assistant.

      A user needs to find a nearby auto repair shop or mechanic.
      Their current GPS coordinates are: latitude ${lat}, longitude ${lng}.

      Use the coordinates to infer the city, region, and country.
      Generate a list of exactly 5 realistic, plausible auto repair shops or mechanics
      that could exist near that location.

      Rules:
      - Shop names, addresses, and phone numbers must be culturally appropriate for the inferred region.
      - Each shop's coordinates must be within ~2 km of the input coordinates.
      - Ratings must be between 3.5 and 5.0.
      - Vary open_now across the results — not all should be open or closed.
      - place_id must be unique (e.g. "ai_place_1", "ai_place_2", etc).
      - Phone numbers must follow the local format for the inferred country.
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            mechanics: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  place_id:               { type: SchemaType.STRING },
                  name:                   { type: SchemaType.STRING },
                  vicinity:               { type: SchemaType.STRING },
                  rating:                 { type: SchemaType.NUMBER },
                  user_ratings_total:     { type: SchemaType.NUMBER },
                  formatted_phone_number: { type: SchemaType.STRING },
                  opening_hours: {
                    type: SchemaType.OBJECT,
                    properties: {
                      open_now: { type: SchemaType.BOOLEAN },
                    },
                    required: ["open_now"],
                  },
                  geometry: {
                    type: SchemaType.OBJECT,
                    properties: {
                      location: {
                        type: SchemaType.OBJECT,
                        properties: {
                          lat: { type: SchemaType.NUMBER },
                          lng: { type: SchemaType.NUMBER },
                        },
                        required: ["lat", "lng"],
                      },
                    },
                    required: ["location"],
                  },
                },
                required: [
                  "place_id",
                  "name",
                  "vicinity",
                  "rating",
                  "user_ratings_total",
                  "formatted_phone_number",
                  "opening_hours",
                  "geometry",
                ],
              },
            },
          },
          required: ["mechanics"],
        },
      },
    });

    const response = JSON.parse(result.response.text());
    return NextResponse.json({ mechanics: response.mechanics });

  } catch (error: any) {
    console.error("Find mechanics API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}