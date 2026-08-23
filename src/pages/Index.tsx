import { useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Disclaimer } from "@/components/Disclaimer";
import { Button } from "@/components/ui/button";

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
import { LegalFooter } from "@/components/LegalFooter";
import { Activity, AlertTriangle, ChevronRight, HeartPulse, Leaf, Loader2, Mic, Pill, ScanLine, Search, ShieldAlert, Sparkles, Stethoscope, Wand2 } from "lucide-react";
import { Link } from "react-router-dom";
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

type Pathway = {
  label: string;
  icon: typeof Leaf;
  to?: string;
  target?: string;
};

const PATHWAYS: Pathway[] = [
  { label: "I'm not feeling well", icon: HeartPulse, target: "symptoms" },
  { label: "Talk to a doctor", icon: Stethoscope, to: "/triage" },
  { label: "Help with medicine", icon: Pill, to: "/chemists" },
  { label: "Traditional / herbal care", icon: Leaf, target: "herbal" },
  { label: "Check my existing care", icon: Activity, to: "/diary" },
];

const Index = () => {
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [selected, setSelected] = useState<Remedy | null>(null);
  const [riskChip, setRiskChip] = useState<SymptomChip | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [aiSearching, setAiSearching] = useState(false);
  const intakeRef = useRef<HTMLTextAreaElement>(null);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }


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
          <div className="space-y-10">
            {/* Unified health entry */}
            <section className="space-y-5">
              <p className="font-mono-tech text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {greeting}
                {firstName ? `, ${firstName}` : ""}
              </p>
              <h1 className="font-display text-3xl leading-[1.05] sm:text-4xl">
                How can we<br />
                <span className="text-primary">help you today?</span>
              </h1>
              <p className="text-base text-muted-foreground">
                Tell MedP-AI what's happening — in English or Pidgin.
              </p>

              <div className="space-y-3">
                <div className="relative">
                  <textarea
                    ref={intakeRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={3}
                    aria-label="Tell MedP-AI what's happening"
                    placeholder="e.g. My belle dey pain me since morning"
                    className="w-full resize-none rounded-2xl border-2 border-foreground bg-card p-4 pr-16 text-base font-medium shadow-brutal-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <button
                    onClick={handleVoice}
                    type="button"
                    aria-label="Use voice"
                    className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-xl border-2 border-foreground bg-card text-foreground shadow-brutal-sm brutal-press hover:bg-secondary"
                  >
                    <Mic className="h-5 w-5" />
                  </button>
                </div>
                <Button
                  size="lg"
                  onClick={() => scrollTo("symptoms")}
                  className="h-14 w-full border-2 border-foreground bg-primary font-display text-base uppercase text-primary-foreground shadow-brutal-sm brutal-press hover:bg-primary/90"
                >
                  <Sparkles className="mr-2 h-5 w-5" /> Continue
                </Button>
              </div>

              {/* Contextual quick actions — navigation only */}
              <div className="flex flex-wrap gap-2">
                {PATHWAYS.map((p) => {
                  const cls =
                    "flex min-h-11 items-center gap-2 rounded-full border-2 border-foreground bg-card px-4 py-2.5 text-sm font-semibold shadow-brutal-sm brutal-press hover:bg-secondary";
                  const inner = (
                    <>
                      <p.icon className="h-4 w-4 text-primary" strokeWidth={2.5} />
                      {p.label}
                    </>
                  );
                  return p.to ? (
                    <Link key={p.label} to={p.to} className={cls}>
                      {inner}
                    </Link>
                  ) : (
                    <button key={p.label} type="button" onClick={() => scrollTo(p.target!)} className={cls}>
                      {inner}
                    </button>
                  );
                })}
              </div>
            </section>

            <MyCare />

            {/* Traditional care (existing herbal experience) */}
            <section id="symptoms" className="space-y-3">
              <div>
                <h2 className="font-display text-lg uppercase">Traditional care</h2>
                <p className="text-sm text-muted-foreground">
                  Plants and home remedies, checked for safety with your medicines.
                </p>
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
            <section id="herbal" className="space-y-3">

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

      <LegalFooter />

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
