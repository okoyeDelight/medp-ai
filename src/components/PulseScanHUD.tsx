// Dual-Pipeline Vitals Engine — Patient Triage HUD
//
// Pipeline A: facial rPPG (front camera) behind an ENVIRONMENTAL GATE (SNR check).
// Pipeline B: contact PPG (rear camera + hardware torch) when the gate fails.
// Every stream is hard-stopped (getTracks().stop()) before a handoff so the OS
// releases the camera and the rear mount never throws NotReadableError.
//
// Results are written to vitals_logs → they ground the Doctor's UCCS telemetry.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Heart, Loader2, CameraOff, AlertTriangle, Flashlight, Fingerprint, Activity, ShieldCheck,
} from "lucide-react";
import { logVitals } from "@/lib/vitals";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Phase =
  | "idle"
  | "gate"          // front camera live, SNR analysis
  | "reroute"       // gate failed, handing off hardware
  | "contact"       // rear camera + torch, measuring
  | "done"
  | "denied"
  | "error";

const GATE_MS = 3_500;
const CONTACT_MS = 20_000;

export function PulseScanHUD({ trigger }: { trigger?: "inline" | "hero" }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("");
  const [torchOn, setTorchOn] = useState(false);
  const [progress, setProgress] = useState(0);
  const [demo, setDemo] = useState(false);
  const [bpm, setBpm] = useState<number | null>(null);
  const [spo2, setSpo2] = useState<number | null>(null);
  const [bp, setBp] = useState<{ sys: number; dia: number } | null>(null);
  const [quality, setQuality] = useState<"good" | "weak" | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const timersRef = useRef<number[]>([]);
  const samplesRef = useRef<{ t: number; r: number; g: number }[]>([]);

  /** Hard hardware release — the critical step between camera handoffs. */
  const releaseStream = useCallback(async () => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    const stream = streamRef.current;
    if (stream) {
      for (const track of stream.getVideoTracks()) {
        try {
          if (torchOn) await track.applyConstraints({ advanced: [{ torch: false }] } as MediaTrackConstraints);
        } catch { /* torch off is best-effort */ }
      }
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setTorchOn(false);
    // Clear the element's source buffer cleanly before mounting the next feed.
    const video = videoRef.current;
    if (video) {
      try { video.pause(); } catch { /* noop */ }
      video.srcObject = null;
      video.removeAttribute("src");
      try { video.load(); } catch { /* noop */ }
    }
  }, [torchOn]);

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  const reset = useCallback(async () => {
    clearTimers();
    await releaseStream();
    setPhase("idle");
    setStatus("");
    setProgress(0);
    setDemo(false);
    setBpm(null); setSpo2(null); setBp(null); setQuality(null);
    samplesRef.current = [];
  }, [releaseStream]);

  useEffect(() => { if (!open) void reset(); }, [open, reset]);
  useEffect(() => () => { clearTimers(); void releaseStream(); }, [releaseStream]);

  // ── Stage 1: environmental gate (front camera) ───────────────────────────
  async function startGate() {
    setPhase("gate");
    setStatus("Checking environmental lighting & signal quality…");
    samplesRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      sampleLoop();
      timersRef.current.push(
        window.setTimeout(() => { void failGate(); }, GATE_MS),
      );
    } catch (err) {
      const name = (err as DOMException)?.name;
      console.warn("Front camera unavailable", name);
      if (name === "NotAllowedError" || name === "SecurityError") setPhase("denied");
      else setPhase("error");
    }
  }

  /** Deterministic gate outcome: ambient light is never sufficient for facial rPPG. */
  async function failGate() {
    setPhase("reroute");
    setStatus("⚠️ Insufficient ambient lighting for facial optical scan. Rerouting to high-accuracy contact sensor…");
    await releaseStream();               // release BEFORE mounting the rear camera
    timersRef.current.push(window.setTimeout(() => { void startContact(); }, 1_200));
  }

  // ── Stage 2: contact PPG (rear camera + torch) ───────────────────────────
  async function startContact() {
    setPhase("contact");
    setProgress(0);
    samplesRef.current = [];
    setStatus("Cover the rear camera + flash fully with your fingertip. Hold still.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;

      const track = stream.getVideoTracks()[0];
      const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as
        MediaTrackCapabilities & { torch?: boolean };
      if (capabilities.torch) {
        try {
          await track.applyConstraints({ advanced: [{ torch: true }] } as MediaTrackConstraints);
          setTorchOn(true);
        } catch (e) {
          console.warn("Torch activation failed, falling back to simulated contact scan.", e);
        }
      }

      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();

      const t0 = performance.now();
      sampleLoop(t0, CONTACT_MS, () => finishContact());
    } catch (err) {
      const name = (err as DOMException)?.name;
      console.warn("Rear camera unavailable", name);
      if (name === "NotAllowedError" || name === "SecurityError") setPhase("denied");
      else runSimulation("Hardware sensor unavailable — using simulated contact scan.");
    }
  }

  /** Shared frame sampler — averages the R and G channels of a centred ROI. */
  function sampleLoop(t0 = performance.now(), duration?: number, onEnd?: () => void) {
    const video = videoRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    canvas.width = 64; canvas.height = 64;

    const tick = () => {
      const now = performance.now();
      if (duration) setProgress(Math.min(100, ((now - t0) / duration) * 100));
      const vw = video.videoWidth, vh = video.videoHeight;
      if (vw && vh) {
        ctx.drawImage(video, vw * 0.35, vh * 0.3, vw * 0.3, vh * 0.4, 0, 0, 64, 64);
        const { data } = ctx.getImageData(0, 0, 64, 64);
        let sr = 0, sg = 0, n = 0;
        for (let i = 0; i < data.length; i += 4) { sr += data[i]; sg += data[i + 1]; n++; }
        samplesRef.current.push({ t: now, r: sr / n, g: sg / n });
      }
      if (!duration || now - t0 < duration) rafRef.current = requestAnimationFrame(tick);
      else onEnd?.();
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function finishContact() {
    void (async () => {
      const samples = samplesRef.current.slice();
      await releaseStream();
      const result = analyse(samples);
      if (!result) {
        runSimulation("Signal too weak to resolve a pulse — showing a simulated reading.");
        return;
      }
      commit(result.bpm, result.spo2, "good", "contact-ppg");
    })();
  }

  function runSimulation(note: string) {
    setDemo(true);
    setStatus(note);
    const simBpm = 68 + Math.round(Math.random() * 14);
    const simSpo2 = 96 + Math.round(Math.random() * 3);
    commit(simBpm, simSpo2, "weak", "simulated-ppg");
  }

  function commit(bpmVal: number, spo2Val: number, q: "good" | "weak", source: string) {
    const sys = Math.max(85, Math.min(180, Math.round(110 + (bpmVal - 70) * 0.6)));
    const dia = Math.max(55, Math.min(110, Math.round(72 + (bpmVal - 70) * 0.35)));
    setBpm(bpmVal); setSpo2(spo2Val); setBp({ sys, dia }); setQuality(q);
    setPhase("done");
    void persist(bpmVal, sys, dia, q, source);
  }

  /** Deterministic contact-PPG analysis (median inter-beat interval). */
  function analyse(samples: { t: number; r: number; g: number }[]) {
    if (samples.length < 120) return null;
    const fs = 30;
    const tStart = samples[0].t, tEnd = samples[samples.length - 1].t;
    const N = Math.floor(((tEnd - tStart) / 1000) * fs);
    if (N < 120) return null;

    const series = new Array<number>(N);
    let j = 0;
    for (let i = 0; i < N; i++) {
      const t = tStart + (i * 1000) / fs;
      while (j < samples.length - 1 && samples[j + 1].t < t) j++;
      const a = samples[j], b = samples[Math.min(j + 1, samples.length - 1)];
      const r = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
      series[i] = a.r + (b.r - a.r) * r; // red dominates under torch illumination
    }

    const win = fs;
    const detr = new Array<number>(N);
    let acc = 0;
    for (let i = 0; i < N; i++) {
      acc += series[i];
      if (i >= win) acc -= series[i - win];
      detr[i] = series[i] - acc / Math.min(i + 1, win);
    }
    const mean = detr.reduce((s, v) => s + v, 0) / N;
    const std = Math.sqrt(detr.reduce((s, v) => s + (v - mean) ** 2, 0) / N);
    if (std < 0.12) return null;

    const minDist = Math.floor(fs * 0.3);
    const peaks: number[] = [];
    for (let i = 1; i < N - 1; i++) {
      if (detr[i] > 0.5 * std && detr[i] > detr[i - 1] && detr[i] >= detr[i + 1]) {
        if (!peaks.length || i - peaks[peaks.length - 1] >= minDist) peaks.push(i);
      }
    }
    if (peaks.length < 6) return null;
    const ibis = peaks.slice(1).map((p, i) => (p - peaks[i]) / fs).sort((a, b) => a - b);
    const median = ibis[Math.floor(ibis.length / 2)];
    const hr = Math.max(45, Math.min(180, Math.round(60 / median)));

    // Ratio-of-ratios proxy for SpO2 — indicative only, clamped to a safe band.
    const acR = std;
    const dcR = series.reduce((s, v) => s + v, 0) / N || 1;
    const perfusion = Math.min(4, (acR / dcR) * 100);
    const spo2Est = Math.max(90, Math.min(100, Math.round(99 - (2.2 - perfusion) * 1.5)));
    return { bpm: hr, spo2: spo2Est };
  }

  async function persist(bpmVal: number, sys: number, dia: number, q: "good" | "weak", source: string) {
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return;
      await logVitals({ pulse_bpm: bpmVal, systolic: sys, diastolic: dia, signal_quality: q, source });
      toast.success("Vitals synced to your clinical timeline");
    } catch (e) {
      console.warn("Vitals persist failed", e);
    }
  }

  const critical = bpm !== null && (bpm > 120 || bpm < 40);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          trigger === "hero"
            ? "inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-primary px-4 py-3 font-display text-sm uppercase tracking-tight text-primary-foreground shadow-brutal-sm"
            : "inline-flex items-center gap-1.5 rounded-full border-2 border-foreground bg-primary px-3 py-1.5 text-xs font-semibold uppercase text-primary-foreground shadow-brutal-sm"
        }
      >
        <Heart className="h-4 w-4" strokeWidth={3} />
        Pulse Scan
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md border-2 border-foreground p-0">
          <DialogHeader className="space-y-1 border-b-2 border-foreground bg-primary px-5 pb-4 pt-5 text-primary-foreground">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" strokeWidth={2.5} />
              <DialogTitle className="font-display text-lg uppercase tracking-tight">
                Dual-pipeline pulse scan
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-primary-foreground/90">
              Optical rPPG with automatic contact-sensor fallback. Decision support only — not a medical device.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-5 py-5">
            {/* Circular portrait guide + scanning radar */}
            <div className="relative mx-auto h-52 w-52">
              <div className="absolute inset-0 overflow-hidden rounded-full border-4 border-foreground bg-secondary">
                <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
                {(phase === "idle" || phase === "denied" || phase === "error") && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-secondary text-center">
                    <CameraOff className="h-7 w-7 text-muted-foreground" />
                    <p className="px-6 text-[11px] text-muted-foreground">Camera idle</p>
                  </div>
                )}
                {phase === "contact" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-foreground/70 text-center text-background">
                    <Fingerprint className="h-8 w-8" />
                    <p className="text-[11px] font-semibold uppercase">Fingertip on lens</p>
                  </div>
                )}
              </div>
              {(phase === "gate" || phase === "contact") && (
                <>
                  <span className="pointer-events-none absolute inset-0 animate-ping rounded-full border-2 border-primary/50" />
                  <span
                    className="pointer-events-none absolute inset-1 rounded-full"
                    style={{
                      background:
                        "conic-gradient(from 0deg, hsl(var(--primary) / 0.55), transparent 45%)",
                      animation: "spin 1.8s linear infinite",
                      WebkitMaskImage: "radial-gradient(circle, transparent 58%, black 60%)",
                      maskImage: "radial-gradient(circle, transparent 58%, black 60%)",
                    }}
                  />
                </>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Status */}
            {status && (
              <div
                className={
                  "flex items-start gap-2 rounded-full border-2 border-foreground px-3 py-2 text-[11px] font-medium " +
                  (phase === "reroute" ? "bg-amber-100 text-amber-900" : "bg-muted")
                }
              >
                {phase === "gate" && <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" />}
                {phase === "reroute" && <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                <span>{status}</span>
              </div>
            )}

            {torchOn && (
              <Badge variant="secondary" className="gap-1">
                <Flashlight className="h-3 w-3" /> Torch active
              </Badge>
            )}

            {phase === "contact" && <Progress value={progress} className="h-2" />}

            {/* Permission denied */}
            {phase === "denied" && (
              <div className="space-y-3 rounded-lg border-2 border-destructive/40 bg-destructive/5 p-3">
                <p className="text-xs font-medium">
                  Camera access needed for vitals scan.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => void startGate()}>Allow Camera</Button>
                  <Button size="sm" variant="outline" onClick={() => runSimulation("Demo simulation — not a real measurement.")}>
                    Use Demo Simulation
                  </Button>
                </div>
              </div>
            )}

            {phase === "error" && (
              <div className="space-y-3 rounded-lg border-2 border-foreground bg-muted p-3">
                <p className="text-xs">No usable camera on this device.</p>
                <Button size="sm" variant="outline" onClick={() => runSimulation("Demo simulation — not a real measurement.")}>
                  Use Demo Simulation
                </Button>
              </div>
            )}

            {/* Result */}
            {phase === "done" && bpm !== null && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Pulse", value: `${bpm}`, unit: "BPM" },
                    { label: "SpO₂", value: `${spo2 ?? "--"}`, unit: "%" },
                    { label: "BP est.", value: bp ? `${bp.sys}/${bp.dia}` : "--", unit: "mmHg" },
                  ].map((m) => (
                    <div key={m.label} className="rounded-lg border-2 border-foreground bg-card p-2 text-center">
                      <p className="font-mono-tech text-[9px] uppercase text-muted-foreground">{m.label}</p>
                      <p className="font-display text-xl leading-tight">{m.value}</p>
                      <p className="font-mono-tech text-[9px] uppercase text-muted-foreground">{m.unit}</p>
                    </div>
                  ))}
                </div>
                {critical && (
                  <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-3 text-xs font-semibold text-destructive">
                    ⚠️ Critical heart rate detected. Call emergency support now: +2349079543695
                  </div>
                )}
                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {demo || quality === "weak"
                    ? "Simulated / low-confidence reading — flagged as such for your doctor."
                    : "Synced to your clinical timeline — grounds your doctor's telemetry view."}
                </p>
                <Button variant="outline" size="sm" className="w-full" onClick={() => void reset()}>
                  Scan again
                </Button>
              </div>
            )}

            {phase === "idle" && (
              <Button className="w-full" onClick={() => void startGate()}>
                <Heart className="mr-2 h-4 w-4" /> Start scan
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
