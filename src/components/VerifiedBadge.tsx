import { CheckCircle2, AlertTriangle } from "lucide-react";
import type { Remedy } from "@/data/remedies";

export function VerifiedBadge({ remedy, size = "md" }: { remedy: Remedy; size?: "sm" | "md" }) {
  const isUnverified = !!remedy.__unverified;
  const padding = size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]";
  const icon = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";

  if (isUnverified) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border border-warning/50 bg-warning/15 ${padding} font-mono-tech font-bold uppercase text-warning`}
        title="AI-generated entry — not yet reviewed by a pharmacist."
      >
        <AlertTriangle className={icon} strokeWidth={3} />
        Unverified · AI
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-safe/50 bg-safe/15 ${padding} font-mono-tech font-bold uppercase text-safe`}
      title="Curated and reviewed by a pharmacy student."
    >
      <CheckCircle2 className={icon} strokeWidth={3} />
      Verified
    </span>
  );
}
