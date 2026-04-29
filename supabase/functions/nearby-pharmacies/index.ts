// Find nearby pharmacies via Google Places API (New) — returns name, address,
// distance, phone, rating, and direct call/maps links so the patient can talk
// to the pharmacist immediately.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PlaceRaw {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  shortFormattedAddress?: string;
  internationalPhoneNumber?: string;
  nationalPhoneNumber?: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  googleMapsUri?: string;
  currentOpeningHours?: { openNow?: boolean };
  location?: { latitude: number; longitude: number };
}

function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!KEY) throw new Error("GOOGLE_PLACES_API_KEY is not configured");

    const { lat, lng, radius } = await req.json().catch(() => ({}));
    if (typeof lat !== "number" || typeof lng !== "number") {
      return new Response(JSON.stringify({ error: "lat/lng required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const radiusMeters = Math.min(Math.max(Number(radius) || 3000, 500), 20000);

    const resp = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": KEY,
        "X-Goog-FieldMask": [
          "places.id",
          "places.displayName",
          "places.formattedAddress",
          "places.shortFormattedAddress",
          "places.internationalPhoneNumber",
          "places.nationalPhoneNumber",
          "places.rating",
          "places.userRatingCount",
          "places.websiteUri",
          "places.googleMapsUri",
          "places.currentOpeningHours.openNow",
          "places.location",
        ].join(","),
      },
      body: JSON.stringify({
        includedTypes: ["pharmacy"],
        maxResultCount: 15,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radiusMeters,
          },
        },
        rankPreference: "DISTANCE",
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("Places API error", resp.status, t);
      return new Response(
        JSON.stringify({ error: `Google Places error (${resp.status})`, detail: t }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = (await resp.json()) as { places?: PlaceRaw[] };
    const places = data.places ?? [];
    const pharmacies = places.map((p) => {
      const phone = p.internationalPhoneNumber ?? p.nationalPhoneNumber ?? null;
      const phoneClean = phone?.replace(/[^\d+]/g, "");
      const ploc = p.location ? { lat: p.location.latitude, lng: p.location.longitude } : null;
      return {
        id: p.id,
        name: p.displayName?.text ?? "Pharmacy",
        address: p.shortFormattedAddress ?? p.formattedAddress ?? "",
        phone,
        phoneClean,
        rating: p.rating ?? null,
        ratingCount: p.userRatingCount ?? null,
        openNow: p.currentOpeningHours?.openNow ?? null,
        website: p.websiteUri ?? null,
        mapsUrl: p.googleMapsUri ?? null,
        distanceKm: ploc ? Math.round(distanceKm({ lat, lng }, ploc) * 10) / 10 : null,
        callUrl: phoneClean ? `tel:${phoneClean}` : null,
        whatsappUrl: phoneClean
          ? `https://wa.me/${phoneClean.replace(/^\+/, "")}?text=${encodeURIComponent(
              "Hello, I got your number from MedP-AI. I'd like to ask about a medication.",
            )}`
          : null,
      };
    });

    return new Response(JSON.stringify({ pharmacies }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("nearby-pharmacies error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
