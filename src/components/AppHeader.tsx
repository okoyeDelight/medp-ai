import { Cross, Wifi } from "lucide-react";

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
        <div className="flex items-center gap-1.5 rounded-full border border-foreground/30 bg-secondary px-2.5 py-1">
          <Wifi className="h-3 w-3 text-primary" />
          <span className="font-mono-tech text-[10px] font-semibold uppercase">Data Saver</span>
        </div>
      </div>
    </header>
  );
}
