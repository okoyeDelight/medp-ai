import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Flame, Square, Timer } from "lucide-react";
import { showNotification } from "@/lib/notifications";

interface BoilTimerProps {
  minutes: number;
  remedyName: string;
}

function fmt(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function BoilTimer({ minutes, remedyName }: BoilTimerProps) {
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(minutes * 60);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) {
      setRunning(false);
      void showNotification(
        "Your medicine don boil! 🔥",
        `Carry the ${remedyName} comot for fire now now.`,
        `boil-${remedyName}`,
      );
      // Loud alarm
      const a = audioRef.current;
      if (a) {
        a.loop = true;
        a.currentTime = 0;
        a.play().catch(() => {});
        // Auto-stop after 8s if user no tap
        window.setTimeout(() => {
          if (a) {
            a.pause();
            a.loop = false;
          }
        }, 8000);
      }
      return;
    }
    const id = window.setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => window.clearTimeout(id);
  }, [running, remaining, remedyName]);

  function start() {
    setRemaining(minutes * 60);
    setRunning(true);
  }
  function stop() {
    setRunning(false);
    setRemaining(minutes * 60);
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.loop = false;
      a.currentTime = 0;
    }
  }

  const finished = !running && remaining === 0;

  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-md border-2 border-foreground bg-accent/30 px-3 py-2.5">
      <div className="flex items-center gap-2 min-w-0">
        <Flame className="h-4 w-4 shrink-0 text-danger" strokeWidth={2.5} />
        <div className="min-w-0">
          <p className="font-mono-tech text-[10px] uppercase leading-tight text-muted-foreground">
            {finished ? "Boil done!" : running ? "Boiling…" : `Boil for ${minutes} min`}
          </p>
          <p className="font-display text-lg leading-tight tabular-nums">
            {fmt(remaining)}
          </p>
        </div>
      </div>
      {running ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 border-2 border-foreground bg-background font-display text-xs uppercase shadow-brutal-sm brutal-press"
          onClick={stop}
        >
          <Square className="h-3.5 w-3.5" /> Stop
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          className="h-9 border-2 border-foreground bg-primary font-display text-xs uppercase text-primary-foreground shadow-brutal-sm brutal-press hover:bg-primary/90"
          onClick={start}
        >
          <Timer className="h-3.5 w-3.5" /> {finished ? "Restart" : "Start Timer"}
        </Button>
      )}
      <audio ref={audioRef} src="/alarm.mp3" preload="auto" />
    </div>
  );
}
