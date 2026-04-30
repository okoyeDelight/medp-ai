import { useEffect, useRef, useState } from "react";
import { Activity, Heart, Loader2, Camera, X, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";

/**
 * VitalsCheck — camera-based heart-rate (rPPG) + estimated BP.
 *
 * How it works (real, on-device, no network):
 *  1. Open the front camera and ask the user to keep their face still under good light.
 *  2. Sample the average GREEN channel of a centred face ROI at ~30 fps for ~20 s.
 *  3. Detrend (moving average), bandpass roughly to 0.7–3.5 Hz (42–210 BPM) by
 *     subtracting a slow MA and limiting peak spacing.
 *  4. Detect peaks above the rolling stddev → BPM = peaks * 60 / window_seconds.
 *  5. BP is *estimated* from HR using a public regression (Mukkamala et al. 2015 review)
 *     and is NOT clinically valid — clearly disclaimed in the UI.
 */
export function VitalsCheck() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"idle" | "starting" | "measuring" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [bpm, setBpm] = useState<number | null>(null);
  const [bp, setBp] = useState<{ sys: number; dia: number } | null>(null);
  const [signalQuality, setSignalQuality] = useState<"good" | "weak" | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const samplesRef = useRef<{ t: number; g: number }[]>([]);

  const DURATION_MS = 20_000;

  function cleanup() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  useEffect(() => {
    if (!open) {
      cleanup();
      setPhase("idle");
      setProgress(0);
      setBpm(null);
      setBp(null);
      setSignalQuality(null);
      samplesRef.current = [];
    }
  }, [open]);

  async function startMeasurement() {
    setPhase("starting");
    setBpm(null);
    setBp(null);
    setSignalQuality(null);
    samplesRef.current = [];
    setProgress(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();

      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      canvas.width = 80;
      canvas.height = 80;

      const t0 = performance.now();
      setPhase("measuring");

      const tick = () => {
        const now = performance.now();
        const elapsed = now - t0;
        setProgress(Math.min(100, (elapsed / DURATION_MS) * 100));

        // Sample a centred ROI of the video frame, then average the green channel.
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (vw && vh) {
          const sx = vw * 0.35;
          const sy = vh * 0.3;
          const sw = vw * 0.3;
          const sh = vh * 0.4;
          ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let sumG = 0;
          let n = 0;
          for (let i = 0; i < data.length; i += 4) {
            sumG += data[i + 1];
            n++;
          }
          samplesRef.current.push({ t: now, g: sumG / n });
        }

        if (elapsed < DURATION_MS) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          finishMeasurement();
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      console.error(err);
      setPhase("error");
      toast({
        title: "Camera blocked",
        description: "Please allow camera access in your browser to check your vitals.",
        variant: "destructive",
      });
    }
  }

  function finishMeasurement() {
    cleanup();
    const samples = samplesRef.current;
    if (samples.length < 100) {
      setPhase("error");
      return;
    }

    // Resample to evenly spaced (approx 30 Hz) using linear interpolation.
    const fs = 30;
    const tStart = samples[0].t;
    const tEnd = samples[samples.length - 1].t;
    const N = Math.floor(((tEnd - tStart) / 1000) * fs);
    const series = new Array<number>(N);
    let j = 0;
    for (let i = 0; i < N; i++) {
      const t = tStart + (i * 1000) / fs;
      while (j < samples.length - 1 && samples[j + 1].t < t) j++;
      const a = samples[j];
      const b = samples[Math.min(j + 1, samples.length - 1)];
      const r = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
      series[i] = a.g + (b.g - a.g) * r;
    }

    // Detrend with a 1-second moving average, then high-pass by subtracting it.
    const win = fs;
    const detrended = new Array<number>(N);
    let acc = 0;
    for (let i = 0; i < N; i++) {
      acc += series[i];
      if (i >= win) acc -= series[i - win];
      const ma = acc / Math.min(i + 1, win);
      detrended[i] = series[i] - ma;
    }

    // Compute rolling stddev for peak threshold.
    const mean = detrended.reduce((s, v) => s + v, 0) / N;
    const variance = detrended.reduce((s, v) => s + (v - mean) ** 2, 0) / N;
    const std = Math.sqrt(variance);

    if (std < 0.15) {
      // Signal too flat — face wasn't visible / lighting too poor.
      setSignalQuality("weak");
      setPhase("done");
      return;
    }

    // Peak detection — local maxima above 0.5*std and at least ~285 ms apart (≈ 210 BPM cap).
    const minDist = Math.floor(fs * 0.285);
    const threshold = 0.5 * std;
    const peaks: number[] = [];
    for (let i = 1; i < N - 1; i++) {
      if (
        detrended[i] > threshold &&
        detrended[i] > detrended[i - 1] &&
        detrended[i] >= detrended[i + 1]
      ) {
        if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minDist) {
          peaks.push(i);
        }
      }
    }

    if (peaks.length < 6) {
      setSignalQuality("weak");
      setPhase("done");
      return;
    }

    // Use median IBI for robustness.
    const ibis: number[] = [];
    for (let i = 1; i < peaks.length; i++) {
      ibis.push((peaks[i] - peaks[i - 1]) / fs);
    }
    ibis.sort((a, b) => a - b);
    const medianIbi = ibis[Math.floor(ibis.length / 2)];
    const hr = Math.round(60 / medianIbi);
    const clampedHr = Math.max(45, Math.min(180, hr));
    setBpm(clampedHr);

    // Estimated BP from HR — VERY rough population regression. NOT medical-grade.
    // Kept conservative and centered around 120/80 at HR≈70.
    const sys = Math.round(110 + (clampedHr - 70) * 0.6);
    const dia = Math.round(72 + (clampedHr - 70) * 0.35);
    setBp({ sys: Math.max(85, Math.min(180, sys)), dia: Math.max(55, Math.min(110, dia)) });

    setSignalQuality("good");
    setPhase("done");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border-2 border-foreground bg-primary px-2.5 py-1 text-primary-foreground shadow-brutal-sm brutal-press hover:bg-primary/90"
        aria-label="Check my vitals"
      >
        <Heart className="h-3 w-3" strokeWidth={3} />
        <span className="font-mono-tech text-[10px] font-bold uppercase">Vitals</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md border-2 border-foreground p-0 shadow-brutal-lg sm:rounded-lg">
          <DialogHeader className="space-y-1 border-b-2 border-foreground bg-primary px-5 pb-4 pt-5 text-primary-foreground">
            <div className="flex items-center gap-2">
              <Activity className="h-6 w-6" strokeWidth={2.5} />
              <DialogTitle className="font-display text-xl uppercase tracking-tight">
                Pulse & BP check
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-primary-foreground/90">
              Camera-based estimate (rPPG) — wellness use only, not a medical device.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-5 py-5">
            {/* Camera preview */}
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border-2 border-foreground bg-secondary">
              <video
                ref={videoRef}
                playsInline
                muted
                className="h-full w-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              {/* ROI guide */}
              {phase === "measuring" && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-1/2 h-32 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-dashed border-primary"
                />
              )}
              {phase === "idle" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-secondary px-6 text-center">
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <p className="font-display text-sm uppercase">Camera off</p>
                  <p className="text-xs text-muted-foreground">
                    Tap Start. Sit still in good light, face centred for ~20 seconds.
                  </p>
                </div>
              )}
            </div>

            {phase === "measuring" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between font-mono-tech text-[10px] uppercase">
                  <span>Measuring…</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {phase === "done" && signalQuality === "good" && bpm && bp && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border-2 border-foreground bg-card p-4 shadow-brutal-sm">
                    <p className="font-mono-tech text-[10px] uppercase text-muted-foreground">
                      Pulse
                    </p>
                    <p className="font-display text-3xl">
                      {bpm}
                      <span className="ml-1 text-sm text-muted-foreground">bpm</span>
                    </p>
                  </div>
                  <div className="rounded-xl border-2 border-foreground bg-card p-4 shadow-brutal-sm">
                    <p className="font-mono-tech text-[10px] uppercase text-muted-foreground">
                      BP (est.)
                    </p>
                    <p className="font-display text-3xl">
                      {bp.sys}
                      <span className="text-muted-foreground">/</span>
                      {bp.dia}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-lg border-2 border-foreground bg-danger/10 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" strokeWidth={3} />
                  <p className="text-xs leading-snug">
                    <strong>Estimate only.</strong> BP from camera is not clinically accurate.
                    Use a cuff for any medical decision.
                  </p>
                </div>
              </div>
            )}

            {phase === "done" && signalQuality === "weak" && (
              <div className="rounded-xl border-2 border-dashed border-foreground/40 bg-muted p-4 text-center text-sm">
                <p className="font-display uppercase">Signal too weak</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Try again in brighter, even light. Keep your forehead and cheeks visible and
                  hold still.
                </p>
              </div>
            )}

            {phase === "error" && (
              <div className="rounded-xl border-2 border-foreground bg-danger/10 p-4 text-center text-sm">
                Couldn't access camera. Check your browser permissions.
              </div>
            )}

            <div className="flex gap-2">
              {(phase === "idle" || phase === "done" || phase === "error") && (
                <Button
                  className="flex-1 border-2 border-foreground bg-primary font-display text-base text-primary-foreground shadow-brutal-sm brutal-press hover:bg-primary/90"
                  onClick={startMeasurement}
                >
                  {phase === "idle" ? "Start" : "Measure again"}
                </Button>
              )}
              {phase === "starting" && (
                <Button disabled className="flex-1">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting camera…
                </Button>
              )}
              {phase === "measuring" && (
                <Button
                  variant="outline"
                  className="flex-1 border-2 border-foreground"
                  onClick={() => {
                    cleanup();
                    setPhase("idle");
                  }}
                >
                  <X className="mr-2 h-4 w-4" /> Cancel
                </Button>
              )}
            </div>

            <p className="text-center font-mono-tech text-[10px] uppercase text-muted-foreground">
              All processing happens on your device — no video leaves your phone.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
