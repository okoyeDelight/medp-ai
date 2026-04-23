import { ShieldAlert } from "lucide-react";

export function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <div
      className={
        "flex items-start gap-3 rounded-lg border-2 border-foreground bg-accent px-4 py-3 text-accent-foreground " +
        className
      }
    >
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
      <p className="font-display text-xs uppercase leading-snug sm:text-sm">
        I be AI, I no be Doctor. If e never clear after 2 days, go see Pharmacist.
      </p>
    </div>
  );
}
