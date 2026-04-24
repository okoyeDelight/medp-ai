import { useMemo, useState } from "react";
import type { PrepStep, Remedy, StepVerb } from "@/data/remedies";
import { UnitIcon } from "@/components/UnitIcons";
import { BoilTimer } from "@/components/BoilTimer";
import { Check, Clock, Trash2 } from "lucide-react";

const VERB_COLOR: Record<StepVerb, string> = {
  WASH: "bg-secondary text-secondary-foreground",
  PREP: "bg-secondary text-secondary-foreground",
  MEASURE: "bg-accent text-accent-foreground",
  BOIL: "bg-danger text-danger-foreground",
  SQUEEZE: "bg-accent text-accent-foreground",
  SIEVE: "bg-secondary text-secondary-foreground",
  MIX: "bg-accent text-accent-foreground",
  APPLY: "bg-primary text-primary-foreground",
  DRINK: "bg-primary text-primary-foreground",
};

interface PrepTimelineProps {
  remedy: Remedy;
  /** Called the FIRST time the user checks off the final DRINK/APPLY step. */
  onConsumed: () => void;
}

export function PrepTimeline({ remedy, onConsumed }: PrepTimelineProps) {
  const finalIndex = useMemo(() => {
    for (let i = remedy.prep.length - 1; i >= 0; i--) {
      const v = remedy.prep[i].verb;
      if (v === "DRINK" || v === "APPLY") return i;
    }
    return remedy.prep.length - 1;
  }, [remedy.prep]);

  const [done, setDone] = useState<Set<number>>(new Set());
  const [consumedFired, setConsumedFired] = useState(false);

  function toggle(i: number) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(i)) {
        next.delete(i);
      } else {
        next.add(i);
        if (i === finalIndex && !consumedFired) {
          setConsumedFired(true);
          // Defer so state settles before parent dialog opens
          setTimeout(onConsumed, 50);
        }
      }
      return next;
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-lg uppercase">How to prepare am</h3>
        <span className="font-mono-tech text-[10px] uppercase text-muted-foreground">
          {done.size}/{remedy.prep.length} done
        </span>
      </div>

      <ol className="relative space-y-3 before:absolute before:left-[19px] before:top-3 before:h-[calc(100%-1.5rem)] before:w-0.5 before:bg-foreground/15">
        {remedy.prep.map((step, i) => (
          <StepCard
            key={i}
            index={i}
            step={step}
            done={done.has(i)}
            onToggle={() => toggle(i)}
            remedyLocalName={remedy.localName}
          />
        ))}
      </ol>

      {/* Storage card */}
      {remedy.storage && (
        <div className="mt-2 flex items-start gap-3 rounded-xl border-2 border-foreground bg-card p-4 shadow-brutal-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border-2 border-foreground bg-danger/15 text-danger">
            <Trash2 className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-display text-xs uppercase tracking-wider text-danger">Storage</p>
              <span className="inline-flex items-center gap-1 rounded-full border border-foreground/40 bg-secondary px-1.5 py-0.5 font-mono-tech text-[9px] font-bold uppercase">
                <Clock className="h-2.5 w-2.5" /> 24-Hour
              </span>
            </div>
            <p className="mt-1 text-sm leading-snug text-foreground">{remedy.storage}</p>
          </div>
        </div>
      )}
    </section>
  );
}

interface StepCardProps {
  index: number;
  step: PrepStep;
  done: boolean;
  onToggle: () => void;
  remedyLocalName: string;
}

function StepCard({ index, step, done, onToggle, remedyLocalName }: StepCardProps) {
  return (
    <li className="relative pl-12">
      {/* Number/check bubble */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={done ? `Unmark step ${index + 1}` : `Mark step ${index + 1} done`}
        className={`absolute left-0 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-foreground font-display text-base shadow-brutal-sm brutal-press transition-colors ${
          done ? "bg-safe text-safe-foreground" : "bg-background text-foreground"
        }`}
      >
        {done ? <Check className="h-5 w-5" strokeWidth={3} /> : index + 1}
      </button>

      <div
        className={`rounded-xl border-2 border-foreground bg-card p-4 shadow-brutal-sm transition-opacity ${
          done ? "opacity-60" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span
              className={`inline-block rounded-md border-2 border-foreground px-2 py-0.5 font-display text-[11px] uppercase tracking-wider ${VERB_COLOR[step.verb]}`}
            >
              {step.verb}
            </span>
            <p
              className={`mt-2 text-[15px] font-medium leading-snug ${
                done ? "line-through decoration-2" : ""
              }`}
            >
              {step.text}
            </p>
          </div>
          {step.unit && (
            <div className="flex shrink-0 flex-col items-center gap-0.5 rounded-md border-2 border-foreground bg-background px-2 py-1.5">
              <UnitIcon unit={step.unit} className="h-7 w-7 text-primary" />
              {step.qty ? (
                <span className="font-mono-tech text-[10px] font-bold uppercase">×{step.qty}</span>
              ) : null}
            </div>
          )}
        </div>

        {step.timerMinutes && step.verb === "BOIL" && (
          <BoilTimer minutes={step.timerMinutes} remedyName={remedyLocalName} />
        )}
      </div>
    </li>
  );
}
