import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Loader2, MapPin, MessageCircle, Phone, Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Pharmacy {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  phoneClean: string | null;
  rating: number | null;
  ratingCount: number | null;
  openNow: boolean | null;
  website: string | null;
  mapsUrl: string | null;
  distanceKm: number | null;
  callUrl: string | null;
  whatsappUrl: string | null;
}

interface PharmacyFinderProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function PharmacyFinder({ open, onOpenChange }: PharmacyFinderProps) {
  const [loading, setLoading] = useState(false);
  const [pharmacies, setPharmacies] = useState<Pharmacy[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function callApi(latitude: number, longitude: number) {
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("nearby-pharmacies", {
        body: { lat: latitude, lng: longitude, radius: 5000 },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      setPharmacies(data?.pharmacies ?? []);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Couldn't fetch pharmacies.");
    } finally {
      setLoading(false);
    }
  }

  function tryGetPosition(highAccuracy: boolean): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: highAccuracy,
        timeout: highAccuracy ? 8000 : 15000,
        maximumAge: 60000,
      });
    });
  }

  async function findNearby() {
    setError(null);
    setPharmacies(null);
    if (!("geolocation" in navigator)) {
      setError("Your browser no support location. Open Google Maps search 'pharmacy near me'.");
      return;
    }
    setLoading(true);

    // Try permissions API first for clearer messaging
    try {
      // @ts-expect-error permissions API typing
      const status = await navigator.permissions?.query?.({ name: "geolocation" });
      if (status?.state === "denied") {
        setLoading(false);
        setError(
          "Location is blocked for this site. Tap the lock/info icon in your browser address bar → Site settings → allow Location, then try again.",
        );
        return;
      }
    } catch {
      // permissions API not available — continue
    }

    let pos: GeolocationPosition | null = null;
    try {
      pos = await tryGetPosition(true);
    } catch (e1) {
      // Retry with low accuracy (often works when GPS lock fails)
      try {
        pos = await tryGetPosition(false);
      } catch (e2) {
        const err = (e2 ?? e1) as GeolocationPositionError;
        setLoading(false);
        if (err?.code === 1) {
          setError(
            "Permission denied. Tap the lock/info icon in your browser bar → allow Location for this site, then try again.",
          );
        } else if (err?.code === 2) {
          setError(
            "Couldn't get your position (signal weak). Move near a window or turn on Wi-Fi/GPS, then retry.",
          );
        } else if (err?.code === 3) {
          setError("Location request timed out. Please try again.");
        } else {
          setError(err?.message || "Couldn't read your location. Please try again.");
        }
        return;
      }
    }

    await callApi(pos.coords.latitude, pos.coords.longitude);
  }

  useEffect(() => {
    if (open && !pharmacies && !loading && !error) {
      findNearby();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function copyPhone(p: Pharmacy) {
    if (!p.phone) return;
    navigator.clipboard.writeText(p.phone).then(
      () => toast({ title: "Number copied 📋", description: p.phone! }),
      () => toast({ title: "Couldn't copy", description: p.phone! }),
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto border-2 border-foreground p-0 shadow-brutal-lg sm:rounded-lg">
        <DialogHeader className="space-y-1 border-b-2 border-foreground bg-primary px-5 pb-4 pt-5 text-primary-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="h-6 w-6" strokeWidth={2.5} />
            <DialogTitle className="font-display text-xl uppercase tracking-tight">
              Pharmacies near you
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-primary-foreground/90">
            Call or WhatsApp the pharmacist directly. Powered by Google Places.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-5 py-5">
          {loading && (
            <div className="flex items-center gap-2 rounded-xl border-2 border-dashed border-foreground/30 bg-muted p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Finding pharmacies near you…
            </div>
          )}

          {error && (
            <div className="space-y-3 rounded-xl border-2 border-danger/40 bg-danger/10 p-4 text-sm text-foreground">
              <p>{error}</p>
              <Button
                size="sm"
                variant="outline"
                className="border-2 border-foreground bg-card font-display text-xs uppercase shadow-brutal-sm brutal-press"
                onClick={findNearby}
              >
                Try again
              </Button>
            </div>
          )}

          {!loading && !error && pharmacies && pharmacies.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-foreground/40 bg-muted p-6 text-center text-sm text-muted-foreground">
              No pharmacies found in 3 km. Try a wider area on Google Maps.
            </div>
          )}

          {!loading && !error && pharmacies && pharmacies.length > 0 && (
            <ul className="space-y-3">
              {pharmacies.map((p) => (
                <li
                  key={p.id}
                  className="space-y-2 rounded-xl border-2 border-foreground bg-card p-3 shadow-brutal-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-base leading-tight">{p.name}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {p.address}
                      </p>
                    </div>
                    {p.distanceKm != null && (
                      <span className="shrink-0 rounded-full border-2 border-foreground bg-secondary px-2 py-0.5 font-mono-tech text-[10px] font-bold uppercase">
                        {p.distanceKm} km
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    {p.openNow != null && (
                      <span
                        className={`rounded-full border px-2 py-0.5 font-mono-tech font-bold uppercase ${
                          p.openNow
                            ? "border-safe/50 bg-safe/15 text-safe"
                            : "border-danger/40 bg-danger/10 text-danger"
                        }`}
                      >
                        {p.openNow ? "Open now" : "Closed"}
                      </span>
                    )}
                    {p.rating != null && (
                      <span className="inline-flex items-center gap-1 font-mono-tech font-bold text-muted-foreground">
                        <Star className="h-3 w-3 fill-current text-accent" /> {p.rating}
                        {p.ratingCount ? ` (${p.ratingCount})` : ""}
                      </span>
                    )}
                  </div>

                  {p.phone && (
                    <p
                      className="cursor-pointer font-mono-tech text-xs text-foreground"
                      onClick={() => copyPhone(p)}
                      title="Tap to copy"
                    >
                      📞 {p.phone}
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <Button
                      size="sm"
                      asChild
                      className="h-9 border-2 border-foreground bg-primary font-display text-[11px] uppercase text-primary-foreground shadow-brutal-sm brutal-press hover:bg-primary/90 disabled:opacity-50"
                      disabled={!p.callUrl}
                    >
                      {p.callUrl ? (
                        <a href={p.callUrl}>
                          <Phone className="h-3.5 w-3.5" /> Call
                        </a>
                      ) : (
                        <span>
                          <Phone className="h-3.5 w-3.5" /> No phone
                        </span>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      asChild
                      variant="outline"
                      className="h-9 border-2 border-foreground bg-safe font-display text-[11px] uppercase text-safe-foreground shadow-brutal-sm brutal-press hover:bg-safe/90 disabled:opacity-50"
                      disabled={!p.whatsappUrl}
                    >
                      {p.whatsappUrl ? (
                        <a href={p.whatsappUrl} target="_blank" rel="noreferrer">
                          <MessageCircle className="h-3.5 w-3.5" /> Chat
                        </a>
                      ) : (
                        <span>
                          <MessageCircle className="h-3.5 w-3.5" /> No chat
                        </span>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      asChild
                      variant="outline"
                      className="h-9 border-2 border-foreground bg-accent font-display text-[11px] uppercase text-accent-foreground shadow-brutal-sm brutal-press hover:bg-accent/90"
                    >
                      <a
                        href={
                          p.mapsUrl ??
                          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            `${p.name} ${p.address}`,
                          )}`
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Map
                      </a>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <p className="text-center font-mono-tech text-[10px] uppercase text-muted-foreground">
            Live data from Google Maps. Confirm phone before calling.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
