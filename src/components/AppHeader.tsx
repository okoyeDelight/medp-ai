import { Cross, Stethoscope } from "lucide-react";
import { Link } from "react-router-dom";
import { VitalsCheck } from "@/components/VitalsCheck";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b-2 border-foreground bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-foreground bg-primary text-primary-foreground shadow-brutal-sm">
            <Cross className="h-5 w-5" strokeWidth={3} />
          </div>
          <div className="leading-tight">
            <p className="font-display text-lg tracking-tight">MedP-AI</p>
            <p className="font-mono-tech text-[10px] uppercase text-muted-foreground">
              Your pocket chemist
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/provider/auth"
            className="hidden items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-primary transition hover:bg-primary/10 sm:inline-flex"
          >
            <Stethoscope className="h-3.5 w-3.5" />
            Provider Portal
          </Link>
          <Link
            to="/provider/auth"
            aria-label="Provider Portal"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-primary/30 bg-primary/5 text-primary transition hover:bg-primary/10 sm:hidden"
          >
            <Stethoscope className="h-4 w-4" />
          </Link>
          <VitalsCheck />
        </div>
      </div>
    </header>
  );
}
