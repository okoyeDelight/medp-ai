import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Stethoscope, ShieldCheck, QrCode, Camera } from "lucide-react";
import { fetchProviderStatus } from "@/lib/providerAuth";
import "@/styles/clinical.css";

const schema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(1, "Required").max(128),
});

const HOSPITAL_HINT_KEY = "medp.provider.hospitalIdHint";

export default function ProviderAuth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hospitalId, setHospitalId] = useState(
    () => localStorage.getItem(HOSPITAL_HINT_KEY) ?? "",
  );
  const [busy, setBusy] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) await routeAfterAuth(navigate);
    });
  }, [navigate]);

  function persistHospitalHint(v: string) {
    setHospitalId(v);
    if (v) localStorage.setItem(HOSPITAL_HINT_KEY, v);
    else localStorage.removeItem(HOSPITAL_HINT_KEY);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (error) throw error;
      await routeAfterAuth(navigate);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="theme-clinical min-h-screen">
      <main className="container max-w-md py-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Stethoscope className="h-7 w-7" />
          </div>
          <h1 className="font-display text-2xl">Clinical Desk</h1>
          <p className="mt-1 text-sm text-muted-foreground">Provider sign-in · MedP-AI Hospital Network</p>
        </div>

        <Card className="border shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" /> Verified provider access only
            </CardTitle>
            <CardDescription className="text-xs">
              Patient-facing accounts cannot view this dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="p-email">Work email</Label>
                <Input
                  id="p-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@hospital.org"
                  autoComplete="username"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-password">Password</Label>
                <Input
                  id="p-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-hospital">Hospital ID (optional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="p-hospital"
                    value={hospitalId}
                    onChange={(e) => persistHospitalHint(e.target.value)}
                    placeholder="Paste or scan hospital code"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setScanOpen(true)}
                    className="shrink-0 gap-1.5"
                  >
                    <QrCode className="h-4 w-4" />
                    Scan
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Smart entry: scan the hospital's QR badge to pre-fill your join code.
                </p>
              </div>

              <Button type="submit" disabled={busy} className="w-full">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign in to Clinical Desk
              </Button>
            </form>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Patient?{" "}
              <Link to="/auth" className="font-medium text-primary underline">
                Use the patient app
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>

      <QrScanDialog
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onResult={(text) => {
          persistHospitalHint(text);
          setScanOpen(false);
          toast.success("Hospital code captured");
        }}
      />
    </div>
  );
}

async function routeAfterAuth(navigate: (p: string, opts?: { replace: boolean }) => void) {
  const status = await fetchProviderStatus();
  if (!status.isProvider || !status.hospitalId) {
    navigate("/provider/pending", { replace: true });
  } else {
    navigate("/hospital-dashboard", { replace: true });
  }
}

/** Lightweight QR scanner using BarcodeDetector with manual fallback. */
function QrScanDialog({
  open, onClose, onResult,
}: {
  open: boolean;
  onClose: () => void;
  onResult: (text: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [manual, setManual] = useState("");
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const BD = (window as any).BarcodeDetector;
    if (!BD) {
      setSupported(false);
      return;
    }
    setSupported(true);
    let cancelled = false;
    const detector = new BD({ formats: ["qr_code"] });

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play();
        const tick = async () => {
          if (cancelled || !v) return;
          try {
            const codes = await detector.detect(v);
            if (codes?.[0]?.rawValue) {
              onResult(String(codes[0].rawValue).trim());
              return;
            }
          } catch {/* ignore frame */}
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        setSupported(false);
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, onResult]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" /> Scan Hospital QR
          </DialogTitle>
          <DialogDescription>Point your camera at the hospital code.</DialogDescription>
        </DialogHeader>
        {supported !== false ? (
          <div className="relative overflow-hidden rounded-lg border bg-black">
            <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
            <div className="pointer-events-none absolute inset-6 rounded-md border-2 border-primary/70" />
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Camera scanning unavailable on this device. Type the hospital code manually:
            </p>
            <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Hospital code" />
            <Button className="w-full" onClick={() => manual && onResult(manual.trim())}>
              Use code
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
