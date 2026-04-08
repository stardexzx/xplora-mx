import { NextRequest, NextResponse } from "next/server";

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  duration: string;
  travelMode: string;
  transitDetails?: {
    stopDetails?: {
      arrivalStop?: { name: string };
      departureStop?: { name: string };
    };
    transitLine?: {
      name?: string;
      nameShort?: string;
      color?: string;
      vehicle?: { type?: string };
    };
    headsign?: string;
  };
}

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  encodedPolyline: string;
  steps: RouteStep[];
  bounds: {
    low: { latitude: number; longitude: number };
    high: { latitude: number; longitude: number };
  };
}

const TRAVEL_MODE_MAP: Record<string, string> = {
  DRIVING: "DRIVE",
  WALKING: "WALK",
  TRANSIT: "TRANSIT",
};

export async function POST(req: NextRequest) {
  const { origin, destination, mode } = await req.json();

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "No API key" }, { status: 500 });

  const travelMode = TRAVEL_MODE_MAP[mode] ?? "DRIVE";

  const body: Record<string, unknown> = {
    origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
    destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
    travelMode,
    languageCode: "es",
    units: "METRIC",
    computeAlternativeRoutes: false,
  };

  if (travelMode === "TRANSIT") {
    body.transitPreferences = { routingPreference: "FEWER_TRANSFERS" };
  }

  try {
    const res = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps,routes.viewport",
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("Routes API error:", err);
      return NextResponse.json({ error: "Routes API error", detail: err }, { status: 502 });
    }

    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return NextResponse.json({ error: "No route found" }, { status: 404 });

    const steps: RouteStep[] = [];
    for (const leg of route.legs ?? []) {
      for (const step of leg.steps ?? []) {
        steps.push({
          instruction: step.navigationInstruction?.instructions ?? step.transitDetails?.stopDetails?.departureStop?.name ?? "",
          distanceMeters: step.distanceMeters ?? 0,
          duration: step.staticDuration ?? step.duration ?? "0s",
          travelMode: step.travelMode ?? mode,
          transitDetails: step.transitDetails
            ? {
                stopDetails: step.transitDetails.stopDetails,
                transitLine: step.transitDetails.transitLine,
                headsign: step.transitDetails.headsign,
              }
            : undefined,
        });
      }
    }

    const result: RouteResult = {
      distanceMeters: route.distanceMeters ?? 0,
      durationSeconds: parseInt((route.duration ?? "0s").replace("s", ""), 10),
      encodedPolyline: route.polyline?.encodedPolyline ?? "",
      steps,
      bounds: route.viewport ?? {
        low: { latitude: origin.lat, longitude: origin.lng },
        high: { latitude: destination.lat, longitude: destination.lng },
      },
    };

    return NextResponse.json(result);
  } catch (e) {
    console.error("Route fetch failed:", e);
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}