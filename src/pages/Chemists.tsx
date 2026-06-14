import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  type Pharmacy,
  type PharmacyChatSession,
  buildInteractionReport,
  distanceKm,
  fetchOnlinePharmacies,
  getUserLocation,
  initiateChatSession,
} from "@/lib/telepharmacy";
import { t, type UiLang } from "@/lib/i18n";
import { fetchHealthProfile } from "@/lib/healthProfile";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, MessageCircle, Languages, ShieldCheck } from "lucide-react";
import { SecureChatPanel } from "@/components/telepharmacy/SecureChatPanel";
import { toast } from "sonner";

export default function Chemists() {
  const [lang, setLang] = useState<UiLang>("en");
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [pharms, setPharms] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [meId, setMeId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("Patient");
  const [activeSession, setActiveSession] = useState<PharmacyChatSession | null>(null);
  const [activePharm, setActivePharm] = useState<Pharmacy | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setMeId(data.user?.id ?? null);
      const profile = await fetchHealthProfile().catch(() => null);
      setDisplayName((profile as any)?.display_name ?? data.user?.email ?? "Patient");
      const [l, p] = await Promise.all([getUserLocation(), fetchOnlinePharmacies()]);
      setLoc(l);
      setPharms(p);
      setLoading(false);
    })();
  }, []);

  // Realtime — pharmacies coming online/offline
  useEffect(() => {
    const ch = supabase
      .channel("chemists-discovery")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pharmacies" },
        async () => setPharms(await fetchOnlinePharmacies()),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  // Realtime — watch our pending session being accepted
  useEffect(() => {
    if (!activeSession || activeSession.status !== "pending") return;
    const ch = supabase
      .channel(`chemists-session-${activeSession.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pharmacy_chat_sessions", filter: `id=eq.${activeSession.id}` },
        (payload) => setActiveSession(payload.new as PharmacyChatSession),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [activeSession?.id, activeSession?.status]);

  const sorted = useMemo(() => {
    const withDist = pharms.map((p) => ({
      p,
      d: loc && p.lat != null && p.lng != null ? distanceKm(loc, { lat: p.lat, lng: p.lng }) : Infinity,
    }));
    return withDist.sort((a, b) => a.d - b.d);
  }, [pharms, loc]);

  async function startChat(pharm: Pharmacy) {
    if (!meId) {
      toast.error("Sign in first");
      return;
    }
    setOpening(pharm.id);
    try {
      const report = await buildInteractionReport(meId, displayName);
      const session = await initiateChatSession({ patientId: meId, pharmacy: pharm, report });
      setActiveSession(session);
      setActivePharm(pharm);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start chat");
    } finally {
      setOpening(null);
    }
  }

  // Active consultation view
  if (activeSession && activePharm && meId) {
    if (activeSession.status === "pending") {
      return (
        <div className="min-h-screen bg-background">
          <AppHeader />
          <main className="container max-w-md py-8">
            <div className="rounded-xl border-2 border-foreground bg-card p-6 text-center shadow-brutal">
              <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
              <div className="font-display text-lg">{activePharm.name}</div>
              <p className="mt-2 text-sm text-muted-foreground">{t(lang, "waitingForPharmacist")}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setActiveSession(null);
                  setActivePharm(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </main>
        </div>
      );
    }
    if (activeSession.status === "active") {
      return (
        <div className="min-h-screen bg-background">
          <AppHeader />
          <main className="container max-w-2xl py-4">
            <div className="h-[calc(100vh-160px)]">
              <SecureChatPanel
                session={activeSession}
                meId={meId}
                role="patient"
                counterpartyName={activePharm.name}
                onClosed={() => {
                  setActiveSession(null);
                  setActivePharm(null);
                  toast.success(t(lang, "consultationEnded"));
                }}
              />
            </div>
          </main>
        </div>
      );
    }
    // ended / declined
    setActiveSession(null);
    setActivePharm(null);
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-2xl space-y-4 py-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl">{t(lang, "findChemist")}</h1>
            <p className="text-sm text-muted-foreground">{t(lang, "findChemistSub")}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLang(lang === "en" ? "pcm" : "en")}
            className="gap-1.5"
          >
            <Languages className="h-3.5 w-3.5" />
            {t(lang, "languageToggle")}
          </Button>
        </div>

        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <span className="text-muted-foreground">{t(lang, "yourLocation")}:</span>
          <span className="font-mono">{loc ? `${loc.lat.toFixed(3)}, ${loc.lng.toFixed(3)}` : "—"}</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
            {t(lang, "noPharmacies")}
          </div>
        ) : (
          <ul className="space-y-3">
            {sorted.map(({ p, d }) => (
              <li key={p.id} className="rounded-xl border-2 border-foreground bg-card p-4 shadow-brutal-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-display text-base truncate">{p.name}</div>
                      <Badge className="bg-emerald-600 text-white">{t(lang, "online")}</Badge>
                    </div>
                    {p.address && <div className="mt-0.5 truncate text-xs text-muted-foreground">{p.address}</div>}
                    <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {Number.isFinite(d)
                          ? t(lang, "distanceAway", { km: d.toFixed(1) })
                          : "—"}
                      </span>
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <ShieldCheck className="h-3 w-3" /> Licensed
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  className="mt-3 w-full bg-primary text-primary-foreground"
                  onClick={() => startChat(p)}
                  disabled={opening === p.id}
                >
                  {opening === p.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <MessageCircle className="mr-2 h-4 w-4" />
                  )}
                  {t(lang, "chatWithPharmacist")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
