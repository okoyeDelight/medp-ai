import { useState } from "react";
import type { Remedy } from "@/data/remedies";
import { Button } from "@/components/ui/button";
import { UnitIcon } from "@/components/UnitIcons";
import { ArrowLeft, Bell, MapPin, ShieldCheck, Sprout } from "lucide-react";
import { SafetyGate } from "@/components/SafetyGate";
import { toast } from "@/hooks/use-toast";
import { Disclaimer } from "@/components/Disclaimer";

interface RemedyDetailProps {
  remedy: Remedy;
  onBack: () => void;
  onFindChemist: () => void;
}

export function RemedyDetail({ remedy, onBack, onFindChemist }: RemedyDetailProps) {
  const [gateOpen, setGateOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  function scheduleReminder() {
    const ms = remedy.intervalHours * 60 * 60 * 1000;
    if ("Notification" in window && Notification.permission !== "denied") {
      Notification.requestPermission().then((p) => {
        if (p === "granted") {
          setTimeout(() => {
            new Notification("MedP-AI Dose Reminder", {
              body: `Time to take next dose of ${remedy.localName}. ${remedy.dose}`,
            });
          }, ms);
        }
      });
    }
    toast({
      title: "Reminder set ⏰",
      description: `We go remind you in ${remedy.intervalHours} hours for next dose.`,
    });
  }

  return (
    <div className="space-y-5 pb-10 animate-fade-up">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to remedies
      </button>

      {/* Hero */}
      <div className="overflow-hidden rounded-xl border-2 border-foreground bg-card shadow-brutal">
        <div className="flex items-center gap-4 bg-secondary px-5 py-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border-2 border-foreground bg-background text-5xl shadow-brutal-sm">
            {remedy.emoji}
          </div>
          <div className="min-w-0">
            <p className="font-mono-tech text-[11px] uppercase tracking-wider text-muted-foreground">
              {remedy.name}
            </p>
            <h2 className="font-display text-2xl leading-tight">{remedy.localName}</h2>
            <p className="mt-1 text-sm text-foreground/80">{remedy.blurb}</p>
          </div>
        </div>

        {/* Plant verification */}
        <div className="border-t-2 border-foreground bg-background px-5 py-4">
          <p className="mb-2 font-display text-xs uppercase text-muted-foreground">
            Make sure na the right leaf
          </p>
          <div className="flex h-32 items-center justify-center rounded-md border-2 border-dashed border-foreground/40 bg-muted">
            <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
              <Sprout className="h-8 w-8" />
              <p className="font-mono-tech text-xs">{remedy.imageHint}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Prep cards */}
      <section className="space-y-3">
        <h3 className="font-display text-lg uppercase">How to prepare am</h3>
        <ol className="space-y-3">
          {remedy.prep.map((step, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-xl border-2 border-foreground bg-card p-4 shadow-brutal-sm"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border-2 border-foreground bg-primary font-display text-base text-primary-foreground">
                {i + 1}
              </div>
              <p className="flex-1 pt-1.5 text-[15px] font-medium leading-snug">{step.text}</p>
              {step.unit && (
                <div className="flex shrink-0 flex-col items-center gap-0.5 rounded-md border-2 border-foreground bg-background px-2 py-1.5">
                  <UnitIcon unit={step.unit} className="h-7 w-7 text-primary" />
                  <span className="font-mono-tech text-[10px] font-bold uppercase">
                    {step.qty ? `×${step.qty}` : ""}
                  </span>
                </div>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* Dose */}
      <section className="rounded-xl border-2 border-foreground bg-primary p-5 text-primary-foreground shadow-brutal">
        <p className="font-display text-xs uppercase tracking-wider opacity-80">
          How you go take am
        </p>
        <p className="mt-1 font-display text-xl">{remedy.dose}</p>
      </section>

      {remedy.warning && (
        <div className="rounded-xl border-2 border-danger bg-danger/10 p-4 text-sm font-semibold text-danger">
          ⚠️ {remedy.warning}
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {!confirmed ? (
          <Button
            size="lg"
            className="h-14 border-2 border-foreground bg-primary font-display text-base uppercase text-primary-foreground shadow-brutal brutal-press hover:bg-primary/90 sm:col-span-2"
            onClick={() => setGateOpen(true)}
          >
            <ShieldCheck className="h-5 w-5" /> I wan use this remedy
          </Button>
        ) : (
          <Button
            size="lg"
            className="h-14 border-2 border-foreground bg-accent font-display text-base uppercase text-accent-foreground shadow-brutal brutal-press hover:bg-accent/90 sm:col-span-2"
            onClick={scheduleReminder}
          >
            <Bell className="h-5 w-5" /> Remind me in {remedy.intervalHours}h
          </Button>
        )}
        <Button
          variant="outline"
          size="lg"
          className="h-12 border-2 border-foreground bg-background font-display text-sm uppercase shadow-brutal-sm brutal-press sm:col-span-2"
          onClick={onFindChemist}
        >
          <MapPin className="h-5 w-5" /> Find chemist near me
        </Button>
      </div>

      <Disclaimer />

      <SafetyGate
        remedy={remedy}
        open={gateOpen}
        onOpenChange={setGateOpen}
        onConfirm={() => {
          setConfirmed(true);
          toast({ title: "Safe to proceed ✅", description: "Tap 'Remind Me' to set your dose timer." });
        }}
        onFindChemist={onFindChemist}
      />
    </div>
  );
}
