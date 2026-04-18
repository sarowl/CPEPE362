import { NextResponse } from "next/server";

const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY || "";

const CATEGORY_TIERS = [
  "service.vehicle.repair.car,service.vehicle.repair.motorcycle",
  "service.vehicle.repair",
  "service.vehicle",
];

const SEARCH_RADII = [3000, 6000, 10000]; 

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

    if (!GEOAPIFY_API_KEY) {
      return NextResponse.json(
        { error: "Geoapify API key is not configured." },
        { status: 500 }
      );
    }

    let features: any[] = [];

    for (let i = 0; i < CATEGORY_TIERS.length; i++) {
      const categories = CATEGORY_TIERS[i];
      const radius = SEARCH_RADII[i];

      const url = new URL("https://api.geoapify.com/v2/places");
      url.searchParams.set("categories", categories);
      url.searchParams.set("filter", `circle:${lng},${lat},${radius}`);
      url.searchParams.set("bias", `proximity:${lng},${lat}`); 
      url.searchParams.set("limit", "12");
      url.searchParams.set("apiKey", GEOAPIFY_API_KEY);

      const res = await fetch(url.toString());

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.message ?? `Geoapify error ${res.status}`);
      }

      const data = await res.json();
      features = data.features ?? [];

      if (features.length >= 3) break; 
    }

    const mechanics = features.map((f: any) => {
      const p = f.properties;
      return {
        place_id:               p.place_id,
        name:                   p.name ?? "Auto Repair Shop",
        vicinity:               p.formatted ?? p.address_line2 ?? p.address_line1 ?? "Address unavailable",
        rating:                 p.datasource?.raw?.["rating"] ?? null,
        user_ratings_total:     p.datasource?.raw?.["user_ratings_total"] ?? null,
        formatted_phone_number: p.contact?.phone ?? p.datasource?.raw?.["phone"] ?? null,
        opening_hours:          p.opening_hours
                                  ? { open_now: isOpenNow(p.opening_hours) }
                                  : null,
        geometry: {
          location: {
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
          },
        },
        distance_meters: p.distance ?? null,
      };
    });

    if (mechanics.length === 0) {
      return NextResponse.json(
        { error: "No mechanics found near your location. Try expanding your search area." },
        { status: 404 }
      );
    }

    return NextResponse.json({ mechanics });

  } catch (error: any) {
    console.error("Find mechanics API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


function isOpenNow(ohString: string): boolean {
  try {
    const now = new Date();
    const day = ["Su","Mo","Tu","We","Th","Fr","Sa"][now.getDay()];
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const rules = ohString.split(";").map(r => r.trim());

    for (const rule of rules) {
      const match = rule.match(/^([A-Za-z,\-]+)\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/);
      if (!match) continue;

      const [, daysPart, openTime, closeTime] = match;
      if (!isDayMatch(day, daysPart)) continue;

      const openMins  = timeToMins(openTime);
      const closeMins = timeToMins(closeTime);

      if (currentMins >= openMins && currentMins < closeMins) return true;
    }

    return false;
  } catch {
    return false;
  }
}

function timeToMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

const DAY_ORDER = ["Mo","Tu","We","Th","Fr","Sa","Su"];

function isDayMatch(day: string, daysPart: string): boolean {
  if (daysPart.includes("-")) {
    const [start, end] = daysPart.split("-");
    const si = DAY_ORDER.indexOf(start);
    const ei = DAY_ORDER.indexOf(end);
    const di = DAY_ORDER.indexOf(day);
    return di >= si && di <= ei;
  }
  return daysPart.split(",").includes(day);
}