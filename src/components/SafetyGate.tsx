import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle2, MapPin, ShieldQuestion, X } from "lucide-react";
import type { Interaction, Remedy } from "@/data/remedies";

const SIGNAL: Record<Interaction["level"], { dot: string; bg: string; label: string; icon: string }> = {
  red: { dot: "bg-danger", bg: "bg-danger/10 border-danger", label: "DANGER", icon: "🔴" },
  yellow: { dot: "bg-caution", bg: "bg-caution/15 border-caution", label: "CAUTION", icon: "🟡" },
  green: { dot: "bg-safe", bg: "bg-safe/10 border-safe", label: "SAFE", icon: "🟢" },
};

interface SafetyGateProps {
  remedy: Remedy | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onFindChemist: () => void;
}

export function SafetyGate({ remedy, open, onOpenChange, onConfirm, onFindChemist }: SafetyGateProps) {
  const [stage, setStage] = useState<"ask" | "list" | "clear">("ask");

  if (!remedy) return null;

  const hasRed = remedy.interactions.some((i) => i.level === "red");

  function reset() {
    setStage("ask");
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setStage("ask");
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md border-2 border-foreground p-0 shadow-brutal-lg sm:rounded-lg">
        <DialogHeader className="space-y-2 border-b-2 border-foreground bg-accent px-5 pb-4 pt-5 text-accent-foreground">
          <div className="flex items-center gap-2">
            <ShieldQuestion className="h-6 w-6" strokeWidth={2.5} />
            <DialogTitle className="font-display text-xl uppercase tracking-tight">
              Safety Gate
            </DialogTitle>
          </div>
          <DialogDescription className="font-display text-base text-accent-foreground/90">
            Wait! You dey take any hospital medicine now?
          </DialogDescription>
        </DialogHeader>

        {stage === "ask" && (
          <div className="space-y-3 px-5 py-5">
            <p className="text-sm text-muted-foreground">
              Some herbs no dey gree with hospital drugs. Make we check first before you chop{" "}
              <span className="font-semibold text-foreground">{remedy.localName}</span>.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-foreground bg-background font-display text-base shadow-brutal-sm brutal-press"
                onClick={() => {
                  setStage("clear");
                  setTimeout(() => {
                    onConfirm();
                    reset();
                  }, 600);
                }}
              >
                No, nothing
              </Button>
              <Button
                size="lg"
                className="border-2 border-foreground bg-primary font-display text-base text-primary-foreground shadow-brutal-sm brutal-press hover:bg-primary/90"
                onClick={() => setStage("list")}
              >
                Yes, check am
              </Button>
            </div>
          </div>
        )}

        {stage === "list" && (
          <div className="space-y-3 px-5 py-5">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Combo checker — wetin fit happen if you mix am
            </p>
            <ul className="space-y-2">
              {remedy.interactions.map((i) => {
                const s = SIGNAL[i.level];
                return (
                  <li
                    key={i.drug}
                    className={`flex gap-3 rounded-md border-2 ${s.bg} p-3`}
                  >
                    <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${s.dot} ring-2 ring-foreground`} />
                    <div className="space-y-0.5">
                      <p className="font-mono-tech text-sm font-semibold leading-tight">{i.drug}</p>
                      <p className="text-xs text-muted-foreground">{i.why}</p>
                    </div>
                    <span className="ml-auto font-display text-[10px] uppercase">{s.label}</span>
                  </li>
                );
              })}
            </ul>

            {hasRed && (
              <div className="flex items-start gap-2 rounded-md border-2 border-danger bg-danger/10 p-3 text-danger">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="text-xs font-semibold leading-snug">
                  Red flag dey here. Abeg no chop am — see Pharmacist sharp sharp.
                </p>
              </div>
            )}

            <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
              {hasRed ? (
                <Button
                  size="lg"
                  className="w-full border-2 border-foreground bg-danger font-display text-base text-danger-foreground shadow-brutal-sm pulse-danger brutal-press"
                  onClick={() => {
                    onFindChemist();
                    reset();
                  }}
                >
                  <MapPin className="h-5 w-5" /> Find Chemist Near Me
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="w-full border-2 border-foreground bg-primary font-display text-base text-primary-foreground shadow-brutal-sm brutal-press hover:bg-primary/90"
                  onClick={() => {
                    onConfirm();
                    reset();
                  }}
                >
                  <CheckCircle2 className="h-5 w-5" /> Continue with remedy
                </Button>
              )}
              <Button
                variant="ghost"
                className="w-full font-semibold"
                onClick={reset}
              >
                <X className="h-4 w-4" /> Cancel
              </Button>
            </DialogFooter>
          </div>
        )}

        {stage === "clear" && (
          <div className="flex flex-col items-center gap-2 px-5 py-8 text-safe">
            <CheckCircle2 className="h-12 w-12" strokeWidth={2.5} />
            <p className="font-display text-lg uppercase">All clear — proceed</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
