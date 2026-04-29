import { useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Disclaimer } from "@/components/Disclaimer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  findRemediesFor,
  matchSymptomsFromText,
  REMEDIES,
  SYMPTOMS,
  type Remedy,
  type SymptomChip,
} from "@/data/remedies";
import { RemedyDetail } from "@/components/RemedyDetail";
import { PlantScanner } from "@/components/PlantScanner";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { AlertTriangle, ChevronRight, Loader2, Mic, ScanLine, Search, ShieldAlert, Sparkles, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Index = () => {
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [selected, setSelected] = useState<Remedy | null>(null);
  const [riskChip, setRiskChip] = useState<SymptomChip | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [aiSearching, setAiSearching] = useState(false);

  const symptomKeys = useMemo(() => {
    const fromText = matchSymptomsFromText(text);
    return Array.from(new Set([...picked, ...fromText]));
  }, [text, picked]);

  const results = useMemo(() => findRemediesFor(symptomKeys), [symptomKeys]);

  function toggle(key: string) {
    setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));
  }

  function handleVoice() {
    // @ts-expect-error vendor-prefixed types
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      toast({
        title: "Voice not supported",
        description: "Your browser no support voice. Use the typing box.",
      });
      return;
    }
    const rec = new SR();
    rec.lang = "en-NG";
    rec.onresult = (e: any) => setText(e.results[0][0].transcript);
    rec.start();
    toast({ title: "Talk now 🎤", description: "Tell us wetin dey do you." });
  }

  function findChemist() {
    if (!("geolocation" in navigator)) {
      toast({ title: "Location off", description: "Open Google Maps and search 'pharmacy near me'." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        window.open(
          `https://www.google.com/maps/search/pharmacy/@${latitude},${longitude},15z`,
          "_blank",
        );
      },
      () => {
        window.open("https://www.google.com/maps/search/pharmacy+near+me", "_blank");
      },
    );
  }

  async function searchAnyPlant() {
    const q = text.trim();
    if (q.length < 2) {
      toast({ title: "Type something first", description: "e.g. 'ulcer', 'bitter kola', 'ringworm'." });
      return;
    }
    setAiSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-remedy", { body: { query: q } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.safe === false) {
        toast({
          title: "Can't help with that",
          description: data.refusal_reason ?? "Try a different symptom or plant.",
          variant: "destructive",
        });
        return;
      }
      const remedy: Remedy = data.remedy;
      setSelected(remedy);
      toast({
        title: `${remedy.emoji} ${remedy.localName}`,
        description: "AI-generated entry — confirm with your pharmacist before use.",
      });
    } catch (e) {
      console.error(e);
      toast({
        title: "AI search failed",
        description: e instanceof Error ? e.message : "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setAiSearching(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container max-w-2xl py-6">
        {selected ? (
          <RemedyDetail
            remedy={selected}
            onBack={() => setSelected(null)}
          />
        ) : (
          <div className="space-y-6">
            {/* Hero question */}
            <section className="space-y-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-foreground bg-accent px-3 py-1 font-mono-tech text-[10px] font-bold uppercase text-accent-foreground shadow-brutal-sm">
                <Sparkles className="h-3 w-3" /> Pocket Chemist
              </span>
              <h1 className="font-display text-3xl leading-[1.05] sm:text-4xl">
                Wetin dey do you<br />
                <span className="text-primary">today?</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                Tell us for simple English or Pidgin. We go suggest local herbs wey safe for you.
              </p>
            </section>

            {/* Input */}
            <section className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="e.g. My belle dey pain me since morning"
                  className="h-14 rounded-xl border-2 border-foreground bg-card pl-11 pr-14 text-base font-medium shadow-brutal-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <button
                  onClick={handleVoice}
                  aria-label="Use voice"
                  className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg border-2 border-foreground bg-primary text-primary-foreground shadow-brutal-sm brutal-press"
                >
                  <Mic className="h-5 w-5" />
                </button>
              </div>

              {/* Plant Scanner CTA */}
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="flex w-full items-center gap-3 rounded-xl border-2 border-foreground bg-accent px-4 py-3 text-left text-accent-foreground shadow-brutal-sm brutal-press hover:bg-accent/90"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-foreground bg-primary text-primary-foreground shadow-brutal-sm">
                  <ScanLine className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm uppercase leading-tight">Scan a plant</p>
                  <p className="text-xs opacity-80">
                    Snap the leaf — AI go identify am + show prep & science.
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0" />
              </button>

              <div className="flex flex-wrap gap-2">
                {SYMPTOMS.map((s) => {
                  const active = picked.includes(s.key);
                  const handleClick = () => {
                    if (s.highRisk && !picked.includes(s.key)) {
                      setRiskChip(s);
                      return;
                    }
                    toggle(s.key);
                  };
                  return (
                    <button
                      key={s.key}
                      onClick={handleClick}
                      className={`flex items-center gap-1.5 rounded-full border-2 border-foreground px-3 py-1.5 text-xs font-semibold transition-all ${
                        active
                          ? "bg-primary text-primary-foreground shadow-brutal-sm"
                          : "bg-card text-foreground hover:bg-secondary"
                      }`}
                    >
                      <span className="text-base leading-none">{s.emoji}</span>
                      {s.label}
                      {s.highRisk && (
                        <AlertTriangle
                          className={`h-3.5 w-3.5 ${active ? "text-primary-foreground" : "text-danger"}`}
                          strokeWidth={3}
                          aria-label="High-risk: extra safety check"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Results / browse */}
            <section className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-lg uppercase">
                  {symptomKeys.length > 0 ? "Wetin go work for you" : "Browse all remedies"}
                </h2>
                {results.length > 0 && (
                  <span className="font-mono-tech text-xs text-muted-foreground">
                    {results.length} match{results.length > 1 ? "es" : ""}
                  </span>
                )}
              </div>

              <ul className="space-y-3">
                {(symptomKeys.length > 0 ? results : REMEDIES).map((r) => {
                  const redInteraction = r.interactions.find((i) => i.level === "red");
                  const cautionReason = r.warning ?? redInteraction?.why;
                  return (
                    <li
                      key={r.id}
                      className="group relative flex items-center gap-4 rounded-xl border-2 border-foreground bg-card p-4 shadow-brutal-sm transition-all brutal-press hover:bg-secondary"
                    >
                      <button
                        onClick={() => setSelected(r)}
                        aria-label={`Open ${r.localName}`}
                        className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <div className="pointer-events-none flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border-2 border-foreground bg-background text-3xl">
                        {r.emoji}
                      </div>
                      <div className="pointer-events-none min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-display text-base leading-tight">{r.localName}</p>
                          <VerifiedBadge remedy={r} size="sm" />
                          {cautionReason && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  onClick={(e) => e.stopPropagation()}
                                  className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-danger/40 bg-danger/15 px-1.5 py-0.5 font-mono-tech text-[9px] font-bold uppercase text-danger transition-colors hover:bg-danger/25"
                                  aria-label="Why caution?"
                                >
                                  <AlertTriangle className="h-2.5 w-2.5" strokeWidth={3} />
                                  Caution
                                </button>
                              </PopoverTrigger>
                              <PopoverContent
                                side="top"
                                align="start"
                                className="w-64 border-2 border-foreground bg-card p-3 shadow-brutal-sm"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <p className="font-display text-[10px] uppercase tracking-wider text-danger">
                                  Why caution
                                </p>
                                <p className="mt-1 text-sm leading-snug">{cautionReason}</p>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                        <p className="font-mono-tech text-[10px] uppercase text-muted-foreground">
                          {r.name}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.blurb}</p>
                      </div>
                      <ChevronRight className="pointer-events-none h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </li>
                  );
                })}
              </ul>

              {/* Open AI search — for any plant / symptom not in curated list */}
              <button
                type="button"
                onClick={searchAnyPlant}
                disabled={aiSearching}
                className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-foreground/60 bg-secondary px-4 py-3 text-left shadow-brutal-sm brutal-press hover:bg-secondary/80 disabled:opacity-60"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-foreground bg-accent text-accent-foreground shadow-brutal-sm">
                  {aiSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm uppercase leading-tight">
                    {aiSearching ? "AI dey search…" : "Search any other plant or symptom"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Type above (e.g. "ulcer", "scent leaf") — AI go suggest. Marked Unverified.
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </button>

              {symptomKeys.length > 0 && results.length === 0 && (
                <div className="rounded-xl border-2 border-dashed border-foreground/40 bg-muted p-6 text-center text-sm text-muted-foreground">
                  We never get curated remedy for that. Try the AI search above.
                </div>
              )}
            </section>

            <Disclaimer />
          </div>
        )}
      </main>

      <footer className="border-t-2 border-foreground bg-secondary py-5">
        <div className="container max-w-2xl text-center">
          <p className="font-mono-tech text-[10px] uppercase tracking-wider text-muted-foreground">
            MedP-AI · Built for the Nigerian street · Data Saver Mode
          </p>
        </div>
      </footer>

      {/* High-risk pre-check (e.g. BP) */}
      <Dialog open={!!riskChip} onOpenChange={(o) => !o && setRiskChip(null)}>
        <DialogContent className="max-w-md border-2 border-foreground p-0 shadow-brutal-lg sm:rounded-lg">
          <DialogHeader className="space-y-2 border-b-2 border-foreground bg-danger px-5 pb-4 pt-5 text-danger-foreground">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-6 w-6" strokeWidth={2.5} />
              <DialogTitle className="font-display text-xl uppercase tracking-tight">
                Hold up — safety check
              </DialogTitle>
            </div>
            <DialogDescription className="font-display text-base text-danger-foreground/95">
              {riskChip?.riskQuestion}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 px-5 py-5">
            <p className="text-sm text-muted-foreground">
              Mixing herbs with heart or BP drugs fit cause serious wahala. Make we know first.
            </p>
            <DialogFooter className="grid grid-cols-2 gap-3 sm:flex-row sm:space-x-0">
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-foreground bg-danger font-display text-base text-danger-foreground shadow-brutal-sm brutal-press hover:bg-danger/90"
                onClick={() => {
                  setRiskChip(null);
                  toast({
                    title: "Good call 🩺",
                    description: "Abeg see Pharmacist before you mix any herb with your BP drug.",
                  });
                }}
              >
                Yes, I dey take
              </Button>
              <Button
                size="lg"
                className="border-2 border-foreground bg-primary font-display text-base text-primary-foreground shadow-brutal-sm brutal-press hover:bg-primary/90"
                onClick={() => {
                  if (riskChip) toggle(riskChip.key);
                  setRiskChip(null);
                }}
              >
                No, nothing
              </Button>
            </DialogFooter>
            <p className="text-center font-mono-tech text-[10px] uppercase text-muted-foreground">
              I be AI, I no be Doctor — suggestions only.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Plant Scanner */}
      <PlantScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onIdentified={(r) => setSelected(r)}
      />
    </div>
  );
};

export default Index;
