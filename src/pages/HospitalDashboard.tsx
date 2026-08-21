import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Activity, AlertTriangle, ClipboardList, Heart, LockKeyhole, LogOut,
  MapPin, PhoneCall, ShieldAlert, Stethoscope, Timer, Loader2,
} from "lucide-react";
import { fetchProviderStatus, type ProviderStatus } from "@/lib/providerAuth";
import { terminateIfStale } from "@/lib/consultationSession";
import { ClinicalWorkspace } from "@/components/clinical/ClinicalWorkspace";
import "@/styles/clinical.css";




const IDLE_MS = 180_000;            // 180s ward-mode mask
const QUICK_PIN_KEY = "medp.provider.quickPin";
const PIN_STRIKE_KEY = "medp.provider.pinStrikes";       // legacy global
const PIN_LOCKOUT_KEY = "medp.provider.pinLockoutUntil"; // legacy global
const PER_PATIENT_STRIKE_KEY = (pid: string) => `medp.provider.pinStrikes.${pid}`;
const PER_PATIENT_LOCKOUT_KEY = (pid: string) => `medp.provider.pinLockoutUntil.${pid}`;
const MAX_STRIKES = 3;
const PATIENT_LOCKOUT_MS = 15 * 60 * 1000; // 15 min per-patient lockout
const HR_CRITICAL_HIGH = 120;
const HR_CRITICAL_LOW = 40;
const STALE_MS = 10_000; // >10s old = reconnecting
const HEARTBEAT_STALE_MS = 120_000; // session terminated if heartbeat > 120s
const EMERGENCY_BYPASS_MS = 5 * 60 * 1000; // ignore stale heartbeat for 5 min during emergency

interface SessionRow {
  id: string;
  patient_id: string;
  hospital_id: string;
  pin: string | null;
  pin_expires_at: string;
  ends_at: string;
  claimed_at: string | null;
  provider_id: string | null;
  revoked_at: string | null;
  last_heartbeat: string;
  status: "active" | "terminated";
}

interface VitalsRow {
  user_id: string;
  pulse_bpm: number | null;
  systolic: number | null;
  diastolic: number | null;
  measured_at: string;
}

export default function HospitalDashboard() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<SessionRow | null>(null);
  const [pinDialogFor, setPinDialogFor] = useState<SessionRow | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [strikes, setStrikes] = useState(() => Number(localStorage.getItem(PIN_STRIKE_KEY) ?? 0));
  const [lockoutUntil, setLockoutUntil] = useState<number>(() => Number(localStorage.getItem(PIN_LOCKOUT_KEY) ?? 0));
  const [vitalsByPatient, setVitalsByPatient] = useState<Record<string, VitalsRow>>({});
  const [masked, setMasked] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockValue, setUnlockValue] = useState("");
  const [unlockMode, setUnlockMode] = useState<"quickpin" | "password">("quickpin");
  const [emergency, setEmergency] = useState<{ patientId: string; bpm: number } | null>(null);
  const [emergencyHerbs, setEmergencyHerbs] = useState<Array<{ id: string; remedy_name: string; remedy_local_name: string; taken_at: string; dose: string }>>([]);
  const [providerLocation, setProviderLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const idleTimer = useRef<number | null>(null);
  const emergencyStartedAtRef = useRef<number>(0);

  const [providerEmail, setProviderEmail] = useState<string | null>(null);
  const [providerUserId, setProviderUserId] = useState<string | null>(null);
  // Server-verified owner/developer preview (audit-logged, not a hospital credential).
  const founderMode = status?.isOwnerPreview === true;

  // ── load provider status + sessions ──────────────────────────────────────
  useEffect(() => {
    fetchProviderStatus().then(setStatus);
    supabase.auth.getUser().then(({ data }) => {
      setProviderEmail(data.user?.email ?? null);
      setProviderUserId(data.user?.id ?? null);
    });
  }, []);



  const loadSessions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("consultation_sessions")
      .select("id,patient_id,hospital_id,pin,pin_expires_at,ends_at,claimed_at,provider_id,revoked_at,last_heartbeat,status")
      .is("revoked_at", null)
      .eq("status", "active")
      .gt("ends_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setSessions((data as SessionRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!status?.hospitalId) return;
    loadSessions();
    const ch = supabase
      .channel("dashboard-sessions")
      .on("postgres_changes", { event: "*", schema: "public", table: "consultation_sessions" }, loadSessions)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [status?.hospitalId, loadSessions]);

  // ── live vitals subscription for active session ──────────────────────────
  useEffect(() => {
    if (!activeSession) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("vitals_logs")
        .select("user_id,pulse_bpm,systolic,diastolic,measured_at")
        .eq("user_id", activeSession.patient_id)
        .order("measured_at", { ascending: false })
        .limit(1);
      if (!cancelled && data?.[0]) {
        setVitalsByPatient((m) => ({ ...m, [activeSession.patient_id]: data[0] as VitalsRow }));
        checkCritical(activeSession.patient_id, data[0].pulse_bpm);
      }
    })();
    const ch = supabase
      .channel(`vitals-${activeSession.patient_id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "vitals_logs", filter: `user_id=eq.${activeSession.patient_id}` },
        (payload) => {
          const row = payload.new as VitalsRow;
          setVitalsByPatient((m) => ({ ...m, [row.user_id]: row }));
          checkCritical(row.user_id, row.pulse_bpm);
        },
      )
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.id]);

  // ── critical-vitals trigger (bypasses mask) ──────────────────────────────
  function checkCritical(patientId: string, bpm: number | null) {
    if (bpm == null) return;
    if (bpm > HR_CRITICAL_HIGH || bpm < HR_CRITICAL_LOW) {
      setEmergency({ patientId, bpm });
      emergencyStartedAtRef.current = Date.now();
      setMasked(false); // critical bypass
      // Fetch recent herbal regimen for clinical context (RLS-scoped via consultation)
      supabase
        .from("dose_logs")
        .select("id,remedy_name,remedy_local_name,taken_at,dose")
        .eq("user_id", patientId)
        .order("taken_at", { ascending: false })
        .limit(5)
        .then(({ data }) => setEmergencyHerbs((data as any) ?? []));
      // capture provider GPS for dispatch
      if (!providerLocation && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (p) => setProviderLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
          () => {},
          { enableHighAccuracy: true, timeout: 5000 },
        );
      }
    }
  }

  // Tick for live-connection staleness indicator
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  // ── State-Wipe Watcher ───────────────────────────────────────────────────
  // If the active session is terminated (patient toggle, TTL, heartbeat loss)
  // wipe local patient cache and bounce back to the dashboard. During an
  // emergency, ignore heartbeat staleness for 5 minutes so the doctor doesn't
  // lose the signal while trying to help.
  function wipePatientState(reason: string) {
    setActiveSession(null);
    setVitalsByPatient({});
    setEmergencyHerbs([]);
    setPinDialogFor(null);
    setPinInput("");
    emergencyStartedAtRef.current = 0;
    toast.error(`Session ended — ${reason}. Patient data cleared.`);
    navigate("/hospital-dashboard", { replace: true });
  }

  useEffect(() => {
    if (!activeSession) return;
    const ch = supabase
      .channel(`active-session-${activeSession.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "consultation_sessions", filter: `id=eq.${activeSession.id}` },
        (payload) => {
          const row = payload.new as SessionRow;
          if (row.status === "terminated" || row.revoked_at || !row.pin) {
            wipePatientState("PIN nullified by patient or server");
          } else {
            setActiveSession((cur) => (cur ? { ...cur, ...row } : cur));
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.id]);

  // Heartbeat-stale watchdog (with emergency bypass)
  useEffect(() => {
    if (!activeSession) return;
    const t = window.setInterval(async () => {
      const ageMs = Date.now() - new Date(activeSession.last_heartbeat).getTime();
      const inEmergency =
        !!emergency && Date.now() - emergencyStartedAtRef.current < EMERGENCY_BYPASS_MS;
      if (inEmergency) return; // 5-min emergency bypass
      if (ageMs > HEARTBEAT_STALE_MS) {
        const r = await terminateIfStale(activeSession.id);
        if (r?.terminated || r?.status === "terminated") {
          wipePatientState("patient heartbeat lost (>120s)");
        }
      }
    }, 5_000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.id, emergency]);

  // ── ward-mode inactivity mask (180s) ─────────────────────────────────────
  const resetIdle = useCallback(() => {
    if (emergency) return;
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setMasked(true), IDLE_MS);
  }, [emergency]);

  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetIdle, { passive: true }));
    resetIdle();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetIdle));
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, [resetIdle]);

  // ── PIN handshake (per-patient 3-strike, 15 min lockout) ─────────────────
  function getPatientStrikes(pid: string) {
    return Number(localStorage.getItem(PER_PATIENT_STRIKE_KEY(pid)) ?? 0);
  }
  function getPatientLockout(pid: string) {
    return Number(localStorage.getItem(PER_PATIENT_LOCKOUT_KEY(pid)) ?? 0);
  }
  function pinLocked() {
    const pid = pinDialogFor?.patient_id;
    if (!pid) return lockoutUntil > Date.now();
    return getPatientLockout(pid) > Date.now();
  }
  function recordStrike() {
    const pid = pinDialogFor?.patient_id;
    if (!pid) return;
    const next = getPatientStrikes(pid) + 1;
    localStorage.setItem(PER_PATIENT_STRIKE_KEY(pid), String(next));
    setStrikes(next);
    if (next >= MAX_STRIKES) {
      const until = Date.now() + PATIENT_LOCKOUT_MS;
      localStorage.setItem(PER_PATIENT_LOCKOUT_KEY(pid), String(until));
      setLockoutUntil(until);
      toast.error("Locked for 15 minutes on this patient after 3 wrong PINs.");
    } else {
      toast.error(`Wrong PIN. ${MAX_STRIKES - next} attempt(s) left.`);
    }
  }
  function clearStrikes() {
    const pid = pinDialogFor?.patient_id;
    if (pid) {
      localStorage.removeItem(PER_PATIENT_STRIKE_KEY(pid));
      localStorage.removeItem(PER_PATIENT_LOCKOUT_KEY(pid));
    }
    setStrikes(0);
    setLockoutUntil(0);
    localStorage.removeItem(PIN_STRIKE_KEY);
    localStorage.removeItem(PIN_LOCKOUT_KEY);
  }

  // Sync strike/lockout state when the dialog opens for a different patient
  useEffect(() => {
    if (!pinDialogFor) return;
    setStrikes(getPatientStrikes(pinDialogFor.patient_id));
    setLockoutUntil(getPatientLockout(pinDialogFor.patient_id));
  }, [pinDialogFor?.patient_id]);

  async function handlePinSubmit() {
    if (!pinDialogFor) return;
    if (pinLocked()) return;
    if (!/^\d{4}$/.test(pinInput)) { toast.error("Enter the 4-digit PIN."); return; }
    if (!pinDialogFor.pin) {
      toast.error("PIN nullified. Ask the patient to regenerate.");
      return;
    }
    if (pinInput !== pinDialogFor.pin) { recordStrike(); setPinInput(""); return; }
    if (new Date(pinDialogFor.pin_expires_at) < new Date()) {
      toast.error("PIN expired. Ask the patient to regenerate.");
      return;
    }
    // Claim session
    const me = (await supabase.auth.getUser()).data.user;
    if (!me) return;
    const { error } = await supabase
      .from("consultation_sessions")
      .update({ claimed_at: new Date().toISOString(), provider_id: me.id })
      .eq("id", pinDialogFor.id);
    if (error) { toast.error(error.message); return; }
    clearStrikes();
    toast.success("Consultation unlocked.");
    setActiveSession({ ...pinDialogFor, claimed_at: new Date().toISOString(), provider_id: me.id });
    setPinDialogFor(null);
    setPinInput("");
    loadSessions();
  }

  // ── unlock from ward-mode mask ───────────────────────────────────────────
  async function handleUnlock() {
    if (unlockMode === "quickpin") {
      const stored = localStorage.getItem(QUICK_PIN_KEY);
      if (!stored) {
        // First-time set: any 6 digits become the quick PIN
        if (!/^\d{6}$/.test(unlockValue)) { toast.error("Set a 6-digit Quick PIN."); return; }
        localStorage.setItem(QUICK_PIN_KEY, unlockValue);
        toast.success("Quick PIN set.");
      } else if (stored !== unlockValue) {
        toast.error("Incorrect Quick PIN."); return;
      }
    } else {
      // Password re-auth
      const me = (await supabase.auth.getUser()).data.user;
      if (!me?.email) { toast.error("Session lost."); return; }
      const { error } = await supabase.auth.signInWithPassword({ email: me.email, password: unlockValue });
      if (error) { toast.error("Wrong password."); return; }
    }
    setMasked(false);
    setUnlockOpen(false);
    setUnlockValue("");
    resetIdle();
  }

  // ── end shift ────────────────────────────────────────────────────────────
  async function endShift() {
    try {
      // Best-effort: clear any local cache touching patient data
      Object.keys(localStorage)
        .filter((k) => k.startsWith("medp."))
        .forEach((k) => localStorage.removeItem(k));
      sessionStorage.clear();
      // Clear caches API if available
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch { /* ignore */ }
    await supabase.auth.signOut();
    navigate("/provider/auth", { replace: true });
  }

  // ── derived ──────────────────────────────────────────────────────────────
  const pendingSessions = useMemo(() => sessions.filter((s) => !s.claimed_at), [sessions]);
  const claimedSessions = useMemo(() => sessions.filter((s) => !!s.claimed_at), [sessions]);
  const currentVitals = activeSession ? vitalsByPatient[activeSession.patient_id] : undefined;

  return (
    <div className="theme-clinical min-h-screen bg-background">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
        <div className="container flex max-w-6xl flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-sm">Clinical Desk</span>
                {founderMode && (
                  <Badge variant="outline" className="border-amber-500/60 text-amber-700">
                    Owner preview · testing access
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {status?.hospitalName ?? "Hospital"} ·{" "}
                {providerEmail ?? (founderMode ? "Owner preview session" : "Verified provider")}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-[hsl(var(--safe))] text-[hsl(var(--safe-foreground))] gap-1.5">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
              Secure Session Active
            </Badge>
            <Button variant="destructive" size="sm" onClick={endShift}>
              <LogOut className="mr-2 h-4 w-4" /> End Shift
            </Button>
          </div>
        </div>
      </header>



      {/* ── Body ────────────────────────────────────────────────────────── */}
      <main
        className={`container max-w-6xl space-y-6 py-6 transition-all ${
          masked && !emergency ? "pointer-events-none select-none blur-md" : ""
        }`}
        aria-hidden={masked && !emergency}
      >

        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg">
            <ClipboardList className="h-5 w-5 text-primary" />
            Active Consultations
          </h2>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : sessions.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
              No active consultation sessions at this hospital yet.
            </CardContent></Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...claimedSessions, ...pendingSessions].map((s) => {
                const claimed = !!s.claimed_at;
                const isMine = activeSession?.id === s.id;
                return (
                  <Card
                    key={s.id}
                    className={`cursor-pointer border transition hover:shadow-md ${
                      isMine ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => {
                      if (claimed && s.provider_id) {
                        setActiveSession(s);
                      } else {
                        setPinDialogFor(s);
                      }
                    }}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between text-sm">
                        <span className="font-mono-tech">PT-{s.patient_id.slice(0, 6).toUpperCase()}</span>
                        {claimed ? (
                          <Badge variant="default" className="bg-primary">Active</Badge>
                        ) : (
                          <Badge variant="secondary"><LockKeyhole className="mr-1 h-3 w-3" />PIN</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Ends {new Date(s.ends_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 text-xs text-muted-foreground">
                      {claimed ? "Tap to open clinical feed" : "Tap to enter patient's 4-digit PIN"}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {activeSession && (() => {
          const ageMs = currentVitals ? now - new Date(currentVitals.measured_at).getTime() : Infinity;
          const stale = ageMs > STALE_MS;
          return (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 font-display text-lg">
                <Activity className="h-5 w-5 text-primary" /> Live Clinical Feed
              </h2>
              <Card className={stale ? "opacity-60 grayscale transition-all" : "transition-all"}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm">
                    PT-{activeSession.patient_id.slice(0, 6).toUpperCase()} · vitals
                  </CardTitle>
                  {stale ? (
                    <Badge variant="outline" className="border-muted-foreground/40 text-muted-foreground">
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Reconnecting to Patient…
                    </Badge>
                  ) : (
                    <Badge className="bg-[hsl(var(--safe))] text-[hsl(var(--safe-foreground))]">
                      <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                      Live
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <Heart className="h-3 w-3" /> HR
                    </div>
                    <div className="font-display text-3xl">
                      {currentVitals?.pulse_bpm ?? "—"}
                      <span className="ml-1 text-xs text-muted-foreground">bpm</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">BP</div>
                    <div className="font-display text-3xl">
                      {currentVitals?.systolic ?? "—"}/{currentVitals?.diastolic ?? "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Updated</div>
                    <div className="font-mono-tech text-sm">
                      {currentVitals ? `${Math.max(0, Math.round(ageMs / 1000))}s ago` : "—"}
                    </div>
                  </div>
                </CardContent>
              </Card>
              {stale && (
                <p className="text-xs text-muted-foreground">
                  Signal stale (&gt;10s). Treatment decisions paused until fresh data arrives.
                </p>
              )}
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Timer className="h-3 w-3" /> Inactivity mask engages after 180s — clinical-only data, no profile
                or diary access.
              </p>
            </section>
          );
        })()}

        {status?.hospitalId && (
          <ClinicalWorkspace
            hospitalId={status.hospitalId}
            providerId={providerUserId ?? ""}
            activePatientId={activeSession?.patient_id ?? null}
            activeSessionId={activeSession?.id ?? null}
            founderMode={founderMode}
            onPickPatient={(pid, sid) => {
              const match = sessions.find((s) => s.id === sid || s.patient_id === pid);
              if (match && match.claimed_at && match.provider_id) {
                setActiveSession(match);
              } else if (match) {
                setPinDialogFor(match);
              } else {
                toast.info("This patient is on your roster but has no active clinical stream right now.");
              }
            }}
          />
        )}
      </main>


      {/* ── Ward-mode mask overlay ──────────────────────────────────────── */}
      {masked && !emergency && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/70 backdrop-blur-md">
          <Card className="w-full max-w-sm border shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <LockKeyhole className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Ward Mode</CardTitle>
              <CardDescription>Patient data hidden after inactivity. Verify identity to resume.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={unlockMode === "quickpin" ? "default" : "outline"}
                  onClick={() => setUnlockMode("quickpin")}
                  className="flex-1"
                >Quick PIN</Button>
                <Button
                  size="sm"
                  variant={unlockMode === "password" ? "default" : "outline"}
                  onClick={() => setUnlockMode("password")}
                  className="flex-1"
                >Password</Button>
              </div>
              <Input
                type={unlockMode === "quickpin" ? "tel" : "password"}
                inputMode={unlockMode === "quickpin" ? "numeric" : "text"}
                maxLength={unlockMode === "quickpin" ? 6 : 128}
                value={unlockValue}
                onChange={(e) => setUnlockValue(e.target.value)}
                placeholder={
                  unlockMode === "quickpin"
                    ? localStorage.getItem(QUICK_PIN_KEY) ? "6-digit Quick PIN" : "Set a 6-digit Quick PIN"
                    : "Account password"
                }
              />
              <Button className="w-full" onClick={handleUnlock}>Resume</Button>
              <Button variant="ghost" size="sm" className="w-full" onClick={endShift}>
                <LogOut className="mr-2 h-4 w-4" /> End Shift instead
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── PIN handshake dialog (3-strike) ─────────────────────────────── */}
      <Dialog open={!!pinDialogFor} onOpenChange={(o) => { if (!o) { setPinDialogFor(null); setPinInput(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" /> Patient PIN Required
            </DialogTitle>
            <DialogDescription>
              Enter the 4-digit consultation PIN the patient is showing you.
            </DialogDescription>
          </DialogHeader>
          {pinLocked() ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
              <div className="flex items-center gap-2 font-display">
                <AlertTriangle className="h-4 w-4" /> Locked
              </div>
              <p className="mt-1 text-xs">
                Too many wrong attempts. Try again at{" "}
                {new Date(lockoutUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.
              </p>
            </div>
          ) : (
            <>
              <Input
                autoFocus
                type="tel"
                inputMode="numeric"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="text-center font-mono-tech text-2xl tracking-[0.5em]"
              />
              <p className="text-xs text-muted-foreground">
                Attempts remaining: <strong>{Math.max(0, MAX_STRIKES - strikes)}</strong> · 3-strike lockout enforced.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setPinDialogFor(null); setPinInput(""); }}>
                  Cancel
                </Button>
                <Button onClick={handlePinSubmit}>Unlock</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Emergency overlay ───────────────────────────────────────────── */}
      {emergency && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-destructive/95 p-4 text-destructive-foreground">
          <div className="w-full max-w-md space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-destructive-foreground/20">
              <AlertTriangle className="h-9 w-9" />
            </div>
            <div>
              <div className="font-display text-3xl uppercase tracking-wide">Critical Alert</div>
              <p className="mt-1 text-sm opacity-90">
                Patient PT-{emergency.patientId.slice(0, 6).toUpperCase()} HR <strong>{emergency.bpm} bpm</strong>
                {" — outside safe range (40–120)."}
              </p>
            </div>
            <div className="rounded-lg bg-destructive-foreground/10 p-4 text-left text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {providerLocation
                  ? `${providerLocation.lat.toFixed(5)}, ${providerLocation.lng.toFixed(5)}`
                  : "Acquiring GPS…"}
              </div>
              <div className="mt-1 text-xs opacity-80">Provider device location for response coordination.</div>
            </div>
            <div className="rounded-lg bg-destructive-foreground/10 p-4 text-left text-sm">
              <div className="flex items-center gap-2 font-display text-xs uppercase tracking-wider opacity-90">
                <ClipboardList className="h-4 w-4" /> Recent Herbal Regimen (last 5)
              </div>
              {emergencyHerbs.length === 0 ? (
                <p className="mt-1 text-xs opacity-80">No recent herbal entries on file.</p>
              ) : (
                <ul className="mt-1 space-y-0.5 text-xs">
                  {emergencyHerbs.map((h) => (
                    <li key={h.id} className="flex justify-between gap-2">
                      <span className="truncate">
                        {h.remedy_name}
                        {h.remedy_local_name ? ` (${h.remedy_local_name})` : ""} · {h.dose}
                      </span>
                      <span className="opacity-70 shrink-0">
                        {new Date(h.taken_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-1 text-[10px] opacity-70">Clinical context for emergency triage.</p>
            </div>
            <a
              href="tel:112"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-destructive-foreground px-4 py-3 font-display text-destructive"
            >
              <PhoneCall className="h-5 w-5" /> Call 112 (Nigeria)
            </a>
            <Button variant="outline" className="w-full border-destructive-foreground/40 bg-transparent text-destructive-foreground hover:bg-destructive-foreground/10" onClick={() => setEmergency(null)}>
              Acknowledge & Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
