import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Feel } from "@/lib/diary";

interface FeelCheckProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (feel: Feel) => void;
}

const OPTIONS: { feel: Feel; emoji: string; label: string; bg: string }[] = [
  { feel: "better", emoji: "😊", label: "Better", bg: "bg-safe text-safe-foreground" },
  { feel: "same", emoji: "😐", label: "Same", bg: "bg-accent text-accent-foreground" },
  { feel: "worse", emoji: "🤒", label: "Worse", bg: "bg-danger text-danger-foreground" },
];

export function FeelCheck({ open, onOpenChange, onPick }: FeelCheckProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-2 border-foreground p-0 shadow-brutal-lg sm:rounded-lg">
        <DialogHeader className="space-y-1 border-b-2 border-foreground bg-secondary px-5 pb-4 pt-5">
          <DialogTitle className="font-display text-xl uppercase tracking-tight">
            How you dey feel now?
          </DialogTitle>
          <DialogDescription className="text-sm">
            We go save am for your Health Diary so you fit show Pharmacist later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3 px-5 py-5">
          {OPTIONS.map((o) => (
            <Button
              key={o.feel}
              type="button"
              size="lg"
              onClick={() => {
                onPick(o.feel);
                onOpenChange(false);
              }}
              className={`flex h-24 flex-col items-center justify-center gap-1 border-2 border-foreground font-display text-sm uppercase shadow-brutal-sm brutal-press ${o.bg}`}
            >
              <span className="text-3xl leading-none">{o.emoji}</span>
              {o.label}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
