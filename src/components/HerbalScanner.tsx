// Herbal Supplement Scanner — full-screen rear-camera modal with demo OCR.
// Hardware is hard-released (track.stop()) whenever the modal closes/unmounts.

import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Leaf, Loader2, X, ScanLine, CameraOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BotanicalProfile {
  id: string;
  nafdac_code: string;
  product_name: string;
  cyp450_risk_level: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  interaction_advisory: string;
}

const RISK_STYLES: Record<string, string> = {
  LOW: "bg-emerald-600 text-white",
  MODERATE: "bg-amber-500 text-black",
  HIGH: "bg-orange-600 text-white",
  CRITICAL: "bg-red-600 text-white",
};

export function HerbalScanner({
  open,
  onOpenChange,
  onIdentified,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onIdentified: (profile: BotanicalProfile) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  const [camError, setCamError] = useState<string | null>(null);
  const [codes, setCodes] = useState<{ nafdac_code: string; product_name: string }[]>([]);
  const [selected, setSelected] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<BotanicalProfile | null>(null);

  /** Strict hardware cleanup. */
  const releaseCamera = useCallback(() => {
    if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null; }
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    const v = videoRef.current;
    if (v) {
      try { v.pause(); } catch { /* noop */ }
      v.srcObject = null;
      v.removeAttribute("src");
      try { v.load(); } catch { /* noop */ }
    }
  }, []);

  // Unmount safety net
  useEffect(() => () => releaseCamera(), [releaseCamera]);

  // Start / stop rear camera with modal lifecycle
  useEffect(() => {
    if (!open) {
      releaseCamera();
      setScanning(false);
      setResult(null);
      setSelected("");
      setCamError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) { v.srcObject = stream; await v.play().catch(() => undefined); }
      } catch (err) {
        const name = (err as DOMException)?.name;
        setCamError(
          name === "NotAllowedError"
            ? "Camera permission denied. You can still use the demo selector below."
            : "No rear camera available. Use the demo selector below.",
        );
      }
    })();
    return () => { cancelled = true; releaseCamera(); };
  }, [open, releaseCamera]);

  // Pull 5 random NAFDAC codes from the seeded registry
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data, error } = await supabase
        .from("nafdac_herbal_registry" as any)
        .select("nafdac_code,product_name")
        .limit(120);
      if (error || !data) return;
      const pool = [...(data as any[])];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      setCodes(pool.slice(0, 5) as any);
    })();
  }, [open]);

  async function runDemoScan(code: string) {
    setSelected(code);
    setResult(null);
    setScanning(true);
    await new Promise<void>((resolve) => {
      timerRef.current = window.setTimeout(() => resolve(), 3000);
    });
    const { data, error } = await supabase
      .from("nafdac_herbal_registry" as any)
      .select("id,nafdac_code,product_name,cyp450_risk_level,interaction_advisory")
      .eq("nafdac_code", code)
      .maybeSingle();
    setScanning(false);
    if (error || !data) {
      toast.error("No registry match for that NAFDAC code.");
      return;
    }
    const profile = data as unknown as BotanicalProfile;
    setResult(profile);
    onIdentified(profile);
    toast.success(`${profile.product_name}`, {
      description: `CYP450 risk: ${profile.cyp450_risk_level}`,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="h-[100dvh] max-w-none gap-0 border-0 bg-black p-0 text-white sm:rounded-none"
        hideCloseButton
      >
        <DialogTitle className="sr-only">Scan herbal supplement</DialogTitle>
        <DialogDescription className="sr-only">
          Align the product label inside the frame to read its NAFDAC code.
        </DialogDescription>

        <div className="relative h-full w-full overflow-hidden">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="absolute inset-0 h-full w-full object-cover"
          />
          {camError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-900 px-8 text-center">
              <CameraOff className="h-8 w-8 text-emerald-400" />
              <p className="text-sm text-white/70">{camError}</p>
            </div>
          )}

          {/* Top bar */}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-4">
            <div className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-emerald-400" />
              <span className="text-sm font-semibold">Herbal Supplement Scan</span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/15"
              onClick={() => onOpenChange(false)}
              aria-label="Close scanner"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Bounding box */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-48 w-72 rounded-xl">
              <span className="absolute -left-0.5 -top-0.5 h-8 w-8 rounded-tl-xl border-l-4 border-t-4 border-emerald-400" />
              <span className="absolute -right-0.5 -top-0.5 h-8 w-8 rounded-tr-xl border-r-4 border-t-4 border-emerald-400" />
              <span className="absolute -bottom-0.5 -left-0.5 h-8 w-8 rounded-bl-xl border-b-4 border-l-4 border-emerald-400" />
              <span className="absolute -bottom-0.5 -right-0.5 h-8 w-8 rounded-br-xl border-b-4 border-r-4 border-emerald-400" />
              <div className="absolute inset-x-2 top-0 h-0.5 animate-[herbscan_2s_ease-in-out_infinite] bg-emerald-400 shadow-[0_0_12px_2px_rgba(52,211,153,0.9)]" />
            </div>
          </div>

          {/* Bottom panel */}
          <div className="absolute inset-x-0 bottom-0 space-y-3 bg-gradient-to-t from-black via-black/85 to-transparent p-4 pb-6">
            <p className="text-center text-xs text-white/70">
              {scanning
                ? "Reading label…"
                : "Align the product label inside the frame. Hold steady."}
            </p>

            {scanning && (
              <div className="flex items-center justify-center gap-2 text-sm text-emerald-300">
                <Loader2 className="h-4 w-4 animate-spin" /> OCR in progress…
              </div>
            )}

            {result && !scanning && (
              <div className="rounded-lg border border-emerald-500/40 bg-white/5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{result.product_name}</span>
                  <Badge className={RISK_STYLES[result.cyp450_risk_level]}>
                    {result.cyp450_risk_level}
                  </Badge>
                </div>
                <p className="mt-1 font-mono text-[10px] uppercase text-white/50">
                  NAFDAC {result.nafdac_code}
                </p>
                <p className="mt-2 text-xs text-white/80">{result.interaction_advisory}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wide text-white/50">
                Demo OCR — pick a NAFDAC code
              </p>
              <Select value={selected} onValueChange={runDemoScan} disabled={scanning}>
                <SelectTrigger className="border-emerald-500/50 bg-white/10 text-white">
                  <SelectValue placeholder="Select a registry code to simulate" />
                </SelectTrigger>
                <SelectContent>
                  {codes.map((c) => (
                    <SelectItem key={c.nafdac_code} value={c.nafdac_code}>
                      {c.nafdac_code} — {c.product_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {result && !scanning && (
              <Button
                className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => onOpenChange(false)}
              >
                Attach to my triage
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
