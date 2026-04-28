import { useEffect, useState } from "react";
import type { Remedy } from "@/data/remedies";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Bell,
  BellRing,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Sprout,
} from "lucide-react";
import { SafetyGate } from "@/components/SafetyGate";
import { toast } from "@/hooks/use-toast";
import { Disclaimer } from "@/components/Disclaimer";
import { PrepTimeline } from "@/components/PrepTimeline";
import { FeelCheck } from "@/components/FeelCheck";
import { Plant3DViewer } from "@/components/Plant3DViewer";
import { ScienceSnapshot } from "@/components/ScienceSnapshot";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { logDose, setFeel, type Feel } from "@/lib/diary";
import { ensureNotificationPermission, scheduleNotification, showNotification } from "@/lib/notifications";

interface RemedyDetailProps {
  remedy: Remedy;
  onBack: () => void;
  onFindChemist: () => void;
}

export function RemedyDetail({ remedy, onBack, onFindChemist }: RemedyDetailProps) {
  const [gateOpen, setGateOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [feelOpen, setFeelOpen] = useState(false);
  const [lastLogId, setLastLogId] = useState<string | null>(null);
  const [reminderHours, setReminderHours] = useState<number>(remedy.intervalHours);
  const [reminderSet, setReminderSet] = useState(false);

  // Fresh state per remedy
  useEffect(() => {
    setConfirmed(false);
    setFeelOpen(false);
    setLastLogId(null);
    setReminderSet(false);
    setReminderHours(remedy.intervalHours);
  }, [remedy.id, remedy.intervalHours]);

  async function handleConsumed() {
    try {
      const id = await logDose(remedy);
      setLastLogId(id);
      setFeelOpen(true);
    } catch (e) {
      console.error(e);
      toast({
        title: "Couldn't save to diary",
        description: "We go try again next time. Check your network.",
      });
    }
  }

  async function handleFeel(feel: Feel) {
    if (!lastLogId) return;
    try {
      await setFeel(lastLogId, feel);
      toast({
        title: "Saved to diary ✅",
        description:
          feel === "worse"
            ? "If e get worse, abeg see Pharmacist quick quick."
            : "We dey track your progress.",
      });
    } catch (e) {
      console.error(e);
    }
  }

  async function setNextDoseAlarm() {
    const perm = await ensureNotificationPermission();
    if (perm !== "granted") {
      toast({
        title: "Allow notifications",
        description: "We need notification permission to remind you. Check your browser settings.",
      });
      return;
    }
    const ms = reminderHours * 60 * 60 * 1000;
    scheduleNotification(
      ms,
      "🕒 Time to take your MedP-AI!",
      `Drink ${remedy.dose} now. No forget!`,
      `dose-${remedy.id}`,
    );
    // Friendly preview so the user knows it works
    void showNotification(
      "Reminder set ⏰",
      `We go ping you in ${reminderHours} hour${reminderHours > 1 ? "s" : ""} for next dose.`,
      `dose-set-${remedy.id}`,
    );
    setReminderSet(true);
    toast({
      title: "Alarm set ⏰",
      description: `We go remind you in ${reminderHours}h: "${remedy.dose}"`,
    });
  }

  const HOUR_OPTIONS = [4, 6, 8, 12, 24];

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
            <div className="mt-1.5"><VerifiedBadge remedy={remedy} /></div>
            <p className="mt-2 text-sm text-foreground/80">{remedy.blurb}</p>
          </div>
        </div>

        {remedy.__unverified && (
          <div className="border-t-2 border-foreground bg-caution/15 px-5 py-3 text-xs font-semibold text-foreground">
            ⚠️ <strong>Unverified AI entry.</strong> A pharmacy student has NOT reviewed this remedy. Always confirm dose, interactions, and identity with a real pharmacist before use.
          </div>
        )}

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

      {/* Vertical timeline of detailed steps */}
      <PrepTimeline remedy={remedy} onConsumed={handleConsumed} />

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

      {/* Stream B — The Lab: Science & Research accordion */}
      <ScienceSnapshot remedy={remedy} />

      {/* Action buttons */}
      <div className="grid grid-cols-1 gap-3">
        {!confirmed ? (
          <Button
            size="lg"
            className="h-14 border-2 border-foreground bg-primary font-display text-base uppercase text-primary-foreground shadow-brutal brutal-press hover:bg-primary/90"
            onClick={() => setGateOpen(true)}
          >
            <ShieldCheck className="h-5 w-5" /> I wan use this remedy
          </Button>
        ) : (
          <div className="space-y-3 rounded-xl border-2 border-foreground bg-card p-4 shadow-brutal">
            <div>
              <p className="font-display text-sm uppercase tracking-wider">
                Set Alarm for Next Dose
              </p>
              <p className="text-xs text-muted-foreground">When you wan take the next one?</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {HOUR_OPTIONS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setReminderHours(h)}
                  className={`rounded-full border-2 border-foreground px-3 py-1 font-mono-tech text-xs font-bold uppercase transition-colors ${
                    reminderHours === h
                      ? "bg-primary text-primary-foreground shadow-brutal-sm"
                      : "bg-background text-foreground hover:bg-secondary"
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>
            <Button
              size="lg"
              className={`h-14 w-full border-2 border-foreground font-display text-base uppercase shadow-brutal brutal-press ${
                reminderSet
                  ? "bg-safe text-safe-foreground hover:bg-safe/90"
                  : "bg-accent text-accent-foreground hover:bg-accent/90"
              }`}
              onClick={setNextDoseAlarm}
            >
              {reminderSet ? (
                <>
                  <CheckCircle2 className="h-5 w-5" /> Alarm set — remind me in {reminderHours}h
                </>
              ) : (
                <>
                  <BellRing className="h-5 w-5" /> Set alarm for {reminderHours}h
                </>
              )}
            </Button>
          </div>
        )}
        <Button
          variant="outline"
          size="lg"
          className="h-12 border-2 border-foreground bg-background font-display text-sm uppercase shadow-brutal-sm brutal-press"
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
          toast({
            title: "Safe to proceed ✅",
            description: "Follow the steps. When you check 'DRINK' we go save am for your diary.",
          });
        }}
        onFindChemist={onFindChemist}
      />

      <FeelCheck open={feelOpen} onOpenChange={setFeelOpen} onPick={handleFeel} />
    </div>
  );
}
