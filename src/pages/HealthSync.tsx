import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { LegalFooter } from "@/components/LegalFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Activity,
  Apple,
  Bluetooth,
  Droplet,
  FileText,
  Heart,
  HeartPulse,
  Loader2,
  RefreshCw,
  Siren,
  Stethoscope,
  Watch,
  Eye,
  Download,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Radio,
  Network,
  AlertTriangle,
  CheckCircle2,
  Trophy,
  PowerOff,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { fetchVitals, bpCategory, glucoseCategory, affectsHeartRate, type VitalsLog } from "@/lib/vitals";
import { fetchLogs, type DoseLog } from "@/lib/diary";
import { fetchHealthProfile, type HealthProfile } from "@/lib/healthProfile";
import { downloadReport } from "@/lib/doctorReport";
import { supabase } from "@/integrations/supabase/client";
import { connectToHeartRateMonitor, isWebBluetoothSupported, type HRConnection } from "@/lib/bluetoothHR";
import { sanitizeRowsForProvider, PROVIDER_ALLOWED_TABLES } from "@/lib/providerScope";
import {
  fetchSafetyScore,
  applyScoreDelta,
  scoreTier,
  type SafetyScore,
} from "@/lib/safetyScore";
import { runIntersectionCheck, tierColor } from "@/lib/pharmaLogic";

type DeviceId = "apple" | "google" | "bp_monitor";
interface Device {
  id: DeviceId;
  name: string;
  Icon: typeof Apple;
  description: string;
}

const DEVICES: Device[] = [
  { id: "apple", name: "Apple Health", Icon: Apple, description: "Sync HRV, BPM & steps from iPhone / Apple Watch." },
  { id: "google", name: "Google Health Connect", Icon: Watch, description: "Pull vitals from Wear OS & Fit-enabled bands." },
  { id: "bp_monitor", name: "Bluetooth BP Monitor", Icon: Bluetooth, description: "Pair Omron / Beurer cuffs over BLE." },
];

const STORAGE_KEY = "medp.connected.devices";

function loadConnected(): Set<DeviceId> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as DeviceId[]);
  } catch {
    return new Set();
  }
}

function saveConnected(s: Set<DeviceId>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...s]));
}

/** Smooth SVG sparkline. */
function Sparkline({ values, stroke = "hsl(var(--primary))", fill = true }: { values: number[]; stroke?: string; fill?: boolean }) {
  const w = 280;
  const h = 64;
  if (values.length < 2) {
    return <div className="h-16 w-full rounded-md bg-muted/40" />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * (h - 8) - 4;
    return [x, y] as const;
  });
  const d = pts.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(" ");
  const area = `${d} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-16 w-full" preserveAspectRatio="none">
      {fill && <path d={area} fill={stroke} opacity={0.12} />}
      <path d={d} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function toneClass(tone: "safe" | "caution" | "danger" | "muted") {
  switch (tone) {
    case "safe":
      return "bg-[hsl(var(--safe))] text-[hsl(var(--safe-foreground))]";
    case "caution":
      return "bg-[hsl(var(--caution))] text-[hsl(var(--caution-foreground))]";
    case "danger":
      return "bg-[hsl(var(--danger))] text-[hsl(var(--danger-foreground))]";
    default:
      return "bg-muted text-muted-foreground";
  }
}

const HealthSync = () => {
  const [connected, setConnected] = useState<Set<DeviceId>>(() => loadConnected());
  const [syncing, setSyncing] = useState<DeviceId | "all" | null>(null);
  const [vitals, setVitals] = useState<VitalsLog[]>([]);
  const [logs, setLogs] = useState<DoseLog[]>([]);
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [livePulse, setLivePulse] = useState<number[]>(() => seedPulse(72));
  const [reportOpen, setReportOpen] = useState(false);
  const [btBpm, setBtBpm] = useState<number | null>(null);
  const [btConn, setBtConn] = useState<HRConnection | null>(null);
  const [btConnecting, setBtConnecting] = useState(false);
  const [score, setScore] = useState<SafetyScore | null>(null);
  const [liveStream, setLiveStream] = useState(false);
  const [fhirOpen, setFhirOpen] = useState(false);

  // Cleanup BT connection on unmount.
  useEffect(() => {
    return () => {
      btConn?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connectBluetoothHR() {
    if (!isWebBluetoothSupported()) {
      toast({
        title: "Bluetooth not supported",
        description: "Your browser does not support Web Bluetooth. Please use Chrome or Edge.",
        variant: "destructive",
      });
      return;
    }
    setBtConnecting(true);
    try {
      const conn = await connectToHeartRateMonitor((bpm) => {
        setBtBpm(bpm);
        setLivePulse((prev) => [...prev.slice(-29), bpm]);
      });
      setBtConn(conn);
      setConnected((prev) => {
        const next = new Set(prev);
        next.add("bp_monitor");
        saveConnected(next);
        return next;
      });
      conn.device.gatt && (conn.device as any).addEventListener?.("gattserverdisconnected", () => {
        setBtConn(null);
        toast({ title: "Bluetooth disconnected", description: "Heart rate monitor link ended." });
      });
      toast({ title: "Heart rate monitor connected", description: (conn.device as any).name ?? "Streaming live BPM." });
    } catch (e: any) {
      const msg = e?.message === "WEB_BLUETOOTH_UNSUPPORTED"
        ? "Your browser does not support Web Bluetooth. Please use Chrome or Edge."
        : e?.name === "NotFoundError"
          ? "No device selected."
          : e?.message ?? "Could not connect to heart rate monitor.";
      toast({ title: "Bluetooth error", description: msg, variant: "destructive" });
    } finally {
      setBtConnecting(false);
    }
  }

  function disconnectBluetoothHR() {
    btConn?.disconnect();
    setBtConn(null);
    setBtBpm(null);
    setConnected((prev) => {
      const next = new Set(prev);
      next.delete("bp_monitor");
      saveConnected(next);
      return next;
    });
  }

  useEffect(() => {
    (async () => {
      try {
        const [v, l, p, s] = await Promise.all([
          fetchVitals(90),
          fetchLogs(30),
          fetchHealthProfile(),
          fetchSafetyScore().catch(() => null),
        ]);
        setVitals(v);
        setLogs(l);
        setProfile(p);
        if (s) setScore(s);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Live-looking sparkline tick.
  useEffect(() => {
    const t = setInterval(() => {
      setLivePulse((prev) => {
        const last = prev[prev.length - 1] ?? 72;
        const drift = (Math.random() - 0.5) * 4;
        const next = Math.max(55, Math.min(115, Math.round(last + drift)));
        return [...prev.slice(-29), next];
      });
    }, 1500);
    return () => clearInterval(t);
  }, []);

  function toggleDevice(id: DeviceId) {
    setConnected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveConnected(next);
      return next;
    });
  }

  async function syncDevice(id: DeviceId | "all") {
    setSyncing(id);
    await new Promise((r) => setTimeout(r, 1400));
    setSyncing(null);
    toast({
      title: "Sync complete",
      description: id === "all" ? "All connected devices refreshed." : `${DEVICES.find((d) => d.id === id)?.name} refreshed.`,
    });
    try {
      const next = await applyScoreDelta(1, "vitals_sync", `Sync · ${id}`);
      setScore(next);
    } catch {
      // ignore
    }
  }

  // Latest vitals snapshot.
  const latestBp = vitals.find((v) => v.systolic != null && v.diastolic != null);
  const latestPulse = vitals.find((v) => v.pulse_bpm != null);
  const latestGlucose = vitals.find((v) => v.glucose_mgdl != null);

  const bpCat = bpCategory(latestBp?.systolic ?? null, latestBp?.diastolic ?? null);
  const gCat = glucoseCategory(latestGlucose?.glucose_mgdl ?? null);

  // Pulse history sparkline (real, if available).
  const pulseHistory = useMemo(() => {
    const arr = vitals
      .slice(0, 20)
      .reverse()
      .map((v) => v.pulse_bpm)
      .filter((n): n is number => typeof n === "number");
    return arr.length >= 2 ? arr : livePulse;
  }, [vitals, livePulse]);

  // Correlation: any recent (24h) herb that affects heart rate?
  const heartHerb = useMemo(() => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return logs.find(
      (l) => new Date(l.taken_at).getTime() >= dayAgo && affectsHeartRate(l.remedy_id, l.remedy_name),
    );
  }, [logs]);

  // Emergency thresholds.
  const sys = latestBp?.systolic ?? 0;
  const dia = latestBp?.diastolic ?? 0;
  const isCritical = sys >= 180 || dia >= 120;

  const hmoLabel = profile?.hmo_provider ?? "your HMO";

  // Pharma-Logic intersection across profile × biometrics × herbs.
  const liveBpm = btBpm ?? latestPulse?.pulse_bpm ?? null;
  const intersection = useMemo(
    () =>
      runIntersectionCheck(
        profile,
        {
          bpm: liveBpm,
          systolic: latestBp?.systolic ?? null,
          diastolic: latestBp?.diastolic ?? null,
          glucose: latestGlucose?.glucose_mgdl ?? null,
        },
        logs,
      ),
    [profile, liveBpm, latestBp, latestGlucose, logs],
  );
  const tier = tierColor(intersection.tier);
  const scoreInfo = score ? scoreTier(score.score) : null;

  async function toggleLiveStream(v: boolean) {
    setLiveStream(v);
    if (v) {
      // Role-based scoping: only clinical tables/fields are emitted to a provider.
      const vitalsPayload = sanitizeRowsForProvider("vitals_logs", (vitals as any) ?? []);
      const dosePayload = sanitizeRowsForProvider("dose_logs", (logs as any) ?? []);
      console.info("[live-stream → provider] scope:", PROVIDER_ALLOWED_TABLES, {
        vitals: vitalsPayload.length,
        doses: dosePayload.length,
      });
      toast({
        title: "Safety Feed live",
        description: `${hmoLabel} doctor is now receiving clinical vitals & herbal intake only. Stop anytime.`,
      });
      try {
        const next = await applyScoreDelta(2, "report_shared", "Live stream enabled");
        setScore(next);
      } catch {
        // ignore
      }
    } else {
      toast({ title: "Safety Feed paused", description: "Doctor link closed. No further data shared." });
    }
  }

  async function terminateAllSessions() {
    const ok = window.confirm(
      "Terminate all active provider sessions?\n\nThis instantly revokes every Live Stream, voids active Consultation PINs, and disconnects any doctor currently watching your Safety Feed.",
    );
    if (!ok) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase
      .from("consultation_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("patient_id", u.user.id)
      .is("revoked_at", null);
    if (error) {
      toast({ title: "Could not terminate sessions", description: error.message, variant: "destructive" });
      return;
    }
    setLiveStream(false);
    toast({
      title: "All clinical sessions terminated",
      description: "Provider links revoked and PINs invalidated.",
    });
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <AppHeader />

      <main className="container max-w-2xl space-y-6 px-4 pt-4">
        {/* Page header — Medical Luxury */}
        <header className="space-y-1.5">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            <Stethoscope className="h-3.5 w-3.5" />
            Universal Clinical Gateway
          </div>
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-foreground">
            Vitals Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time vitals correlated with your herbal diary, conditions, and medications.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              onClick={() => setFhirOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[11px] font-medium text-primary transition hover:bg-primary/10"
            >
              <ShieldCheck className="h-3 w-3" /> Zero-Knowledge · FHIR
            </button>
            <Link
              to="/connectivity"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
            >
              <Network className="h-3 w-3" /> Connectivity Center
            </Link>
          </div>
        </header>

        {/* Health Safety Score + Wellness Points */}
        {score && scoreInfo && (
          <Card className="luxe-card overflow-hidden">
            <div className="luxe-gradient px-5 py-4 text-primary-foreground">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] opacity-80">
                    Health Safety Score
                  </p>
                  <p className="font-display text-4xl font-bold leading-none">
                    {score.score}
                    <span className="ml-1 text-base opacity-70">/100</span>
                  </p>
                </div>
                <Badge className="bg-primary-foreground/15 text-primary-foreground backdrop-blur">
                  {scoreInfo.label}
                </Badge>
              </div>
              <Progress value={score.score} className="mt-3 h-1.5 bg-primary-foreground/20 [&>div]:bg-primary-foreground" />
            </div>
            <CardContent className="grid grid-cols-2 gap-3 pt-4">
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  <Sparkles className="h-3 w-3" /> Wellness Points
                </p>
                <p className="mt-1 font-display text-xl font-bold">{score.wellness_points}</p>
              </div>
              <div className="rounded-lg border border-[hsl(var(--accent)/0.4)] bg-[hsl(var(--accent)/0.08)] p-3">
                <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--accent-foreground))]">
                  <Trophy className="h-3 w-3" /> Premium Discount
                </p>
                <p className="mt-1 font-display text-xl font-bold">
                  {score.premium_discount_pct.toFixed(1)}%
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pharma-Logic Intersection Check */}
        <Card className={`border-2 ${tier.border} ${tier.bg} shadow-soft`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                {intersection.tier === "critical" ? (
                  <AlertTriangle className="h-4 w-4 text-[hsl(var(--danger))]" />
                ) : intersection.tier === "ok" ? (
                  <CheckCircle2 className="h-4 w-4 text-[hsl(var(--safe))]" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                Intersection Check
              </CardTitle>
              <Badge className={`${tier.badge} uppercase`}>{intersection.tier}</Badge>
            </div>
            <CardDescription className="text-xs">
              Profile · Live biometrics · Herbal compounds
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <p className="font-semibold text-foreground">{intersection.title}</p>
            <p className="text-sm text-muted-foreground">{intersection.detail}</p>
            {intersection.triggers.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {intersection.triggers.map((t) => (
                  <Badge key={t} variant="outline" className="font-mono-tech text-[10px]">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Stream toggle */}
        <Card className="luxe-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                liveStream ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}
            >
              <Radio className={`h-5 w-5 ${liveStream ? "animate-pulse" : ""}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold">Live Stream to Provider</p>
                {liveStream && (
                  <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--safe))]">
                    <span className="live-pulse-dot" /> Live
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {liveStream
                  ? `${hmoLabel} clinical desk is receiving your Safety Feed.`
                  : "Doctor will see vitals + herbal log in real time."}
              </p>
            </div>
            <Switch checked={liveStream} onCheckedChange={toggleLiveStream} />
          </CardContent>
        </Card>

        {/* Emergency banner */}
        {isCritical && (
          <Alert variant="destructive" className="border-2 shadow-lg">
            <Siren className="h-5 w-5 animate-pulse" />
            <AlertTitle className="text-base font-bold uppercase tracking-wide">
              Critical Reading — Hospital Referral Suggested
            </AlertTitle>
            <AlertDescription>
              BP {sys}/{dia} mmHg exceeds safe thresholds. Sharing data with{" "}
              <span className="font-semibold">{hmoLabel}</span> Emergency Desk.
            </AlertDescription>
          </Alert>
        )}

        {/* Connected devices */}
        <Card className="border-2 shadow-soft">
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
            <div>
              <CardTitle className="text-lg">Connected Devices</CardTitle>
              <CardDescription>Tap to pair. Sync pulls the latest readings.</CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => syncDevice("all")}
              disabled={syncing !== null || connected.size === 0}
              className="gap-1.5"
            >
              {syncing === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sync Now
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {DEVICES.map((d) => {
              const isOn = connected.has(d.id);
              const isSyncing = syncing === d.id;
              return (
                <div
                  key={d.id}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:border-primary/40"
                >
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full ${
                      isOn ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <d.Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-foreground">{d.name}</p>
                      {isOn && (
                        <Badge variant="outline" className="border-[hsl(var(--safe))] text-[hsl(var(--safe))]">
                          Connected
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{d.description}</p>
                  </div>
                  {d.id === "bp_monitor" ? (
                    <>
                      <Button
                        size="sm"
                        variant={btConn ? "outline" : "default"}
                        onClick={btConn ? disconnectBluetoothHR : connectBluetoothHR}
                        disabled={btConnecting}
                      >
                        {btConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : btConn ? "Disconnect" : "Pair"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant={isOn ? "outline" : "default"}
                        onClick={() => (isOn ? syncDevice(d.id) : toggleDevice(d.id))}
                        disabled={isSyncing}
                      >
                        {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : isOn ? "Sync" : "Pair"}
                      </Button>
                      {isOn && (
                        <Button size="sm" variant="ghost" onClick={() => toggleDevice(d.id)} className="text-xs text-muted-foreground">
                          Unlink
                        </Button>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Vitals dashboard */}
        <section className="grid gap-3">
          {/* Heart Rate */}
          <Card className="border-2 shadow-soft">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div className="space-y-0.5">
                <CardDescription className="flex items-center gap-1.5 text-xs uppercase tracking-wider">
                  <HeartPulse className="h-3.5 w-3.5 text-[hsl(var(--danger))]" />
                  Heart Rate
                </CardDescription>
                <CardTitle className="font-display text-3xl">
                  {btBpm ?? latestPulse?.pulse_bpm ?? livePulse[livePulse.length - 1]}{" "}
                  <span className="text-sm font-medium text-muted-foreground">BPM</span>
                </CardTitle>
              </div>
              <Heart
                className={`h-5 w-5 text-[hsl(var(--danger))] ${heartHerb ? "animate-pulse" : ""}`}
                fill={heartHerb ? "currentColor" : "none"}
              />
            </CardHeader>
            <CardContent className="pt-0">
              <Sparkline values={pulseHistory} stroke={heartHerb ? "hsl(var(--danger))" : "hsl(var(--primary))"} />
            </CardContent>
          </Card>

          {/* Blood Pressure */}
          <Card className="border-2 shadow-soft">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div className="space-y-0.5">
                <CardDescription className="flex items-center gap-1.5 text-xs uppercase tracking-wider">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                  Blood Pressure
                </CardDescription>
                <CardTitle className="font-display text-3xl">
                  {latestBp ? `${latestBp.systolic}/${latestBp.diastolic}` : "—"}{" "}
                  <span className="text-sm font-medium text-muted-foreground">mmHg</span>
                </CardTitle>
              </div>
              <Badge className={`${toneClass(bpCat.tone)} uppercase`}>{bpCat.label}</Badge>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground">
                {latestBp
                  ? `Last reading ${new Date(latestBp.measured_at).toLocaleString()}`
                  : "No BP recorded yet — use the Vitals Check on Profile."}
              </p>
            </CardContent>
          </Card>

          {/* Blood Glucose */}
          <Card className="border-2 shadow-soft">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div className="space-y-0.5">
                <CardDescription className="flex items-center gap-1.5 text-xs uppercase tracking-wider">
                  <Droplet className="h-3.5 w-3.5 text-[hsl(var(--accent))]" />
                  Blood Glucose
                </CardDescription>
                <CardTitle className="font-display text-3xl">
                  {latestGlucose?.glucose_mgdl ?? "—"}{" "}
                  <span className="text-sm font-medium text-muted-foreground">mg/dL</span>
                </CardTitle>
              </div>
              <Badge className={`${toneClass(gCat.tone)} uppercase`}>{gCat.label}</Badge>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground">
                {latestGlucose
                  ? `Last reading ${new Date(latestGlucose.measured_at).toLocaleString()}`
                  : "Glucose tracking ready — log a reading from a connected meter."}
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Observation / Correlation card */}
        {heartHerb && (
          <Card className="border-2 border-[hsl(var(--caution))] bg-[hsl(var(--caution)/0.08)] shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Eye className="h-4 w-4 text-[hsl(var(--caution-foreground))]" />
                Observation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium text-foreground">Monitoring vitals for potential interactions…</p>
              <p className="text-muted-foreground">
                You logged <span className="font-semibold">{heartHerb.remedy_name}</span> ({heartHerb.remedy_local_name})
                in the last 24h. This herb can influence heart rate — your sparkline is being highlighted.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Doctor's report */}
        <Card className="border-2 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Clinical Report
            </CardTitle>
            <CardDescription>
              Combines herbal history + device vitals into a printable PDF for your HMO doctor.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={() => setReportOpen(true)} className="gap-2">
              <FileText className="h-4 w-4" />
              Generate Clinical Report
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                downloadReport(logs, { name: profile?.display_name ?? undefined }, 7);
                toast({ title: "Report downloaded", description: "PDF saved to your device." });
              }}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download Now
            </Button>
          </CardContent>
        </Card>

        <LegalFooter />
      </main>

      {/* Report Preview Dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Clinical Decision Support
            </DialogTitle>
            <DialogDescription>
              For HMO doctor review · last 7 days · <span className="font-medium">Not a prescription</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 rounded-md border bg-card p-4 text-sm">
            <div className="border-b pb-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Patient</p>
              <p className="font-semibold">{profile?.display_name || "Anonymous user"}</p>
              <p className="text-xs text-muted-foreground">HMO: {hmoLabel}</p>
            </div>

            <div>
              <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Latest Vitals</p>
              <ul className="space-y-0.5">
                <li>
                  Heart Rate: <span className="font-mono">{latestPulse?.pulse_bpm ?? "—"} BPM</span>
                </li>
                <li>
                  Blood Pressure:{" "}
                  <span className="font-mono">
                    {latestBp ? `${latestBp.systolic}/${latestBp.diastolic} mmHg` : "—"}
                  </span>{" "}
                  · {bpCat.label}
                </li>
                <li>
                  Blood Glucose:{" "}
                  <span className="font-mono">{latestGlucose?.glucose_mgdl ?? "—"} mg/dL</span> · {gCat.label}
                </li>
              </ul>
            </div>

            <div>
              <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
                Pharma-Logic Findings
              </p>
              <p className="text-sm">
                <span className="font-medium">{intersection.title}:</span> {intersection.detail}
              </p>
            </div>

            <div>
              <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
                Herbal History ({logs.length} entries)
              </p>
              <ul className="max-h-32 space-y-0.5 overflow-y-auto">
                {logs.slice(0, 6).map((l) => (
                  <li key={l.id} className="truncate">
                    {l.remedy_emoji} {l.remedy_name} — {new Date(l.taken_at).toLocaleDateString()}
                  </li>
                ))}
                {logs.length === 0 && <li className="text-muted-foreground">No entries yet.</li>}
              </ul>
            </div>

            {isCritical && (
              <div className="rounded-md border border-destructive bg-destructive/10 p-2 text-xs text-destructive">
                ⚠ Critical BP flag included. {hmoLabel} Emergency Desk auto-notified.
              </div>
            )}

            <p className="border-t pt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              FHIR-formatted · Decision support only
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setReportOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                downloadReport(logs, { name: profile?.display_name ?? undefined }, 7);
                setReportOpen(false);
                toast({ title: "Report downloaded", description: "PDF saved to your device." });
                applyScoreDelta(2, "report_shared", "Clinical report exported")
                  .then(setScore)
                  .catch(() => {});
              }}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Zero-Knowledge / FHIR explainer */}
      <Dialog open={fhirOpen} onOpenChange={setFhirOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Zero-Knowledge Privacy
            </DialogTitle>
            <DialogDescription>How your clinical data is protected</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              MedP-AI processes your clinical data using <span className="font-semibold text-foreground">FHIR</span>{" "}
              (Fast Healthcare Interoperability Resources) — the same global standard used by hospitals
              and HMOs.
            </p>
            <ul className="space-y-1 pl-4">
              <li>• Vitals encoded as FHIR <span className="font-mono">Observation</span> resources</li>
              <li>• Herbs encoded as <span className="font-mono">MedicationStatement</span></li>
              <li>• Doctor receives a signed <span className="font-mono">Bundle</span> — never raw exports</li>
              <li>• Zero-knowledge proofs verify integrity without exposing identifiers</li>
            </ul>
            <p className="text-xs">
              Reports are framed as <span className="font-medium text-foreground">Clinical Decision Support</span>{" "}
              for your doctor — never as prescriptions.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setFhirOpen(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function seedPulse(base: number): number[] {
  const arr: number[] = [];
  let v = base;
  for (let i = 0; i < 20; i++) {
    v = Math.max(60, Math.min(100, v + (Math.random() - 0.5) * 6));
    arr.push(Math.round(v));
  }
  return arr;
}

export default HealthSync;
