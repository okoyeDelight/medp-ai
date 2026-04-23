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
import { AlertTriangle, ChevronRight, Mic, Search, ShieldAlert, Sparkles } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container max-w-2xl py-6">
        {selected ? (
          <RemedyDetail
            remedy={selected}
            onBack={() => setSelected(null)}
            onFindChemist={findChemist}
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
                {(symptomKeys.length > 0 ? results : REMEDIES).map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => setSelected(r)}
                      className="group flex w-full items-center gap-4 rounded-xl border-2 border-foreground bg-card p-4 text-left shadow-brutal-sm transition-all brutal-press hover:bg-secondary"
                    >
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border-2 border-foreground bg-background text-3xl">
                        {r.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-display text-base leading-tight">{r.localName}</p>
                          {r.interactions.some((i) => i.level === "red") && (
                            <span className="rounded-full bg-danger/15 px-1.5 py-0.5 font-mono-tech text-[9px] font-bold uppercase text-danger">
                              Caution
                            </span>
                          )}
                        </div>
                        <p className="font-mono-tech text-[10px] uppercase text-muted-foreground">
                          {r.name}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.blurb}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </li>
                ))}
              </ul>

              {symptomKeys.length > 0 && results.length === 0 && (
                <div className="rounded-xl border-2 border-dashed border-foreground/40 bg-muted p-6 text-center text-sm text-muted-foreground">
                  We never get remedy for that one. Abeg see a Pharmacist.
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
    </div>
  );
};

export default Index;
