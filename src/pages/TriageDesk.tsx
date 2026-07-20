// Doctor's Clinical Desk — Triage Waiting Room UI
// - Prominent Triage PIN input (center) with 3-strike lockout per session
// - Active claimed triages → Consultation Dashboard (patient context)
// - Conclude Consultation → Pharmacy Discovery panel (map + list) → ephemeral chat
// - On dispense complete, auto-generates dual PDFs (patient + clinical)
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  KeyRound, Loader2, ShieldAlert, ArrowLeft, Stethoscope, MapPin, Send, X, FileText,
  PhoneCall, ShieldCheck, Users, Search, Pill, Radio, CheckCircle2,
} from "lucide-react";
import {
  claimTriagePin, fetchDoctorActiveTriages, fetchTriageById, concludeTriage,
  createPharmacyHandoff, fetchHandoffById, fetchHandoffMessages, sendHandoffMessage,
  buildClinicalPdf, buildPatientPdf, uploadAndRegisterPdf,
  type TriageSession, type PharmacyHandoff, type DoctorPharmacistMessage, type Prescription,
} from "@/lib/triage";
import {
  fetchOnlinePharmacies, distanceKm, getUserLocation, safetyEmoji, safetyLabel,
  type Pharmacy,
} from "@/lib/telepharmacy";
import { fetchProviderStatus, type ProviderStatus } from "@/lib/providerAuth";
import "@/styles/clinical.css";

const PIN_STRIKES_KEY = "medp.triage.strikes";
const PIN_LOCK_KEY = "medp.triage.lockUntil";
const MAX_STRIKES = 3;
const LOCKOUT_MS = 15 * 60 * 1000;

export default function TriageDesk() {
  const navigate = useNavigate();
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [strikes, setStrikes] = useState(() => Number(localStorage.getItem(PIN_STRIKES_KEY) ?? 0));
  const [lockUntil, setLockUntil] = useState<number>(() => Number(localStorage.getItem(PIN_LOCK_KEY) ?? 0));
  const [now, setNow] = useState(Date.now());
  const [waitingList, setWaitingList] = useState<TriageSession[]>([]);
  const [view, setView] = useState<"desk" | "consult" | "pharmacy" | "chat">("desk");
  const [activeTriage, setActiveTriage] = useState<TriageSession | null>(null);
  const [activeHandoff, setActiveHandoff] = useState<PharmacyHandoff | null>(null);
  const doctorIdRef = useRef<string | null>(null);
  const doctorNameRef = useRef<string>("Doctor");

  useEffect(() => {
    (async () => {
      const st = await fetchProviderStatus();
      setProviderStatus(st);
      if (!st.isProvider) { navigate("/provider/auth"); return; }
      const { data } = await supabase.auth.getUser();
      doctorIdRef.current = data.user?.id ?? null;
      const { data: prof } = await supabase.from("profiles")
        .select("display_name").eq("user_id", doctorIdRef.current ?? "").maybeSingle();
      if ((prof as any)?.display_name) doctorNameRef.current = (prof as any).display_name;
      const t = await fetchDoctorActiveTriages();
      setWaitingList(t);
    })();
  }, [navigate]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Realtime: triage claimed elsewhere -> refresh; handoff status flips
  useEffect(() => {
    const uid = doctorIdRef.current;
    if (!uid) return;
    const ch = supabase.channel("doctor-desk-" + uid)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "triage_sessions", filter: `doctor_id=eq.${uid}` },
        async () => setWaitingList(await fetchDoctorActiveTriages()))
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "pharmacy_handoffs", filter: `doctor_id=eq.${uid}` },
        async (p: any) => {
          if (activeHandoff && p.new?.id === activeHandoff.id) {
            setActiveHandoff(p.new as PharmacyHandoff);
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [doctorIdRef.current, activeHandoff?.id]);

  const locked = lockUntil > now;
  const lockRemaining = Math.max(0, lockUntil - now);

  async function handleClaim() {
    if (locked) return;
    if (pinInput.length !== 4) { toast.error("Enter the 4-digit Triage PIN."); return; }
    setClaiming(true);
    try {
      const sessionId = await claimTriagePin(pinInput);
      localStorage.setItem(PIN_STRIKES_KEY, "0"); setStrikes(0);
      const triage = await fetchTriageById(sessionId);
      if (!triage) throw new Error("Session not found after claim.");
      setActiveTriage(triage);
      setView("consult");
      setPinInput("");
      const t = await fetchDoctorActiveTriages();
      setWaitingList(t);
      toast.success("Patient case unlocked.");
    } catch (e: any) {
      const s = strikes + 1;
      setStrikes(s);
      localStorage.setItem(PIN_STRIKES_KEY, String(s));
      if (s >= MAX_STRIKES) {
        const until = Date.now() + LOCKOUT_MS;
        setLockUntil(until);
        localStorage.setItem(PIN_LOCK_KEY, String(until));
        toast.error("Too many attempts. Locked for 15 minutes.");
      } else {
        toast.error(e.message || `Invalid PIN — ${MAX_STRIKES - s} attempts left.`);
      }
    } finally {
      setClaiming(false);
    }
  }

  async function openTriage(t: TriageSession) {
    setActiveTriage(t);
    setView("consult");
  }

  async function handleConclude() {
    if (!activeTriage) return;
    setView("pharmacy");
  }

  return (
    <div className="theme-clinical min-h-screen bg-gradient-to-b from-clinical-bg to-clinical-bg-soft pb-16">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="container flex items-center gap-3 py-3">
          {view !== "desk" ? (
            <Button variant="ghost" size="sm" onClick={() => setView("desk")}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Waiting room
            </Button>
          ) : (
            <>
              <div className="rounded-md bg-primary/10 p-2 text-primary">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold">Clinical Triage Desk</div>
                <div className="text-xs text-muted-foreground">{providerStatus?.hospitalName ?? "Verifying…"}</div>
              </div>
              <Badge variant="outline" className="ml-auto border-primary/40 bg-primary/5 text-primary">
                Dr. {doctorNameRef.current}
              </Badge>
            </>
          )}
        </div>
      </header>

      <main className="container max-w-5xl space-y-6 py-6">
        {view === "desk" && (
          <>
            <Card className="border-primary/30 bg-card">
              <CardContent className="p-6 sm:p-10">
                <div className="mx-auto max-w-md space-y-5 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <KeyRound className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Enter Patient Triage PIN</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Ask the patient for their 4-digit PIN. It expires 10 minutes after they generate it.
                    </p>
                  </div>
                  <Input
                    inputMode="numeric" maxLength={4} value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    onKeyDown={(e) => e.key === "Enter" && handleClaim()}
                    disabled={locked || claiming}
                    placeholder="••••"
                    className="mx-auto h-16 max-w-[220px] text-center font-mono text-3xl tracking-[0.6em]"
                  />
                  {locked ? (
                    <Alert variant="destructive">
                      <ShieldAlert className="h-4 w-4" />
                      <AlertTitle>Locked</AlertTitle>
                      <AlertDescription>
                        Too many wrong attempts. Try again in {Math.ceil(lockRemaining / 60_000)} min.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Button
                      size="lg" onClick={handleClaim} disabled={claiming || pinInput.length !== 4}
                      className="w-full bg-primary text-white hover:bg-primary/90"
                    >
                      {claiming ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting…</> : "Unlock Patient Case"}
                    </Button>
                  )}
                  {strikes > 0 && !locked && (
                    <div className="text-xs text-muted-foreground">Attempts remaining: {MAX_STRIKES - strikes}/{MAX_STRIKES}</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-primary" /> My active consultations
                </CardTitle>
                <CardDescription>Patients whose PINs you've claimed and are still open.</CardDescription>
              </CardHeader>
              <CardContent>
                {waitingList.length === 0 ? (
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No active consultations. Ask the patient for a fresh Triage PIN to begin.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {waitingList.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => openTriage(t)}
                        className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition hover:border-primary/50 hover:bg-primary/5"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Stethoscope className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {t.interaction_report?.patient_label ?? "Patient"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Opened {new Date(t.claimed_at ?? t.created_at).toLocaleTimeString()} · Safety {safetyLabel(t.interaction_report?.safety_level ?? null)}
                          </div>
                        </div>
                        <Badge variant="outline">Open</Badge>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {view === "consult" && activeTriage && (
          <ConsultationView triage={activeTriage} onConclude={handleConclude} />
        )}

        {view === "pharmacy" && activeTriage && (
          <PharmacyDiscovery
            triage={activeTriage}
            onSelected={async (handoff) => { setActiveHandoff(handoff); setView("chat"); }}
            onCancel={() => setView("consult")}
          />
        )}

        {view === "chat" && activeHandoff && (
          <ClinicianChat
            handoff={activeHandoff}
            role="doctor"
            doctorName={doctorNameRef.current}
            onExit={() => { setView("desk"); setActiveTriage(null); setActiveHandoff(null); }}
          />
        )}
      </main>
    </div>
  );
}

// ------------------------- Consultation view -------------------------
function ConsultationView({ triage, onConclude }: { triage: TriageSession; onConclude: () => void }) {
  const rep = triage.interaction_report;
  return (
    <div className="space-y-4">
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{rep?.patient_label ?? "Patient"}</CardTitle>
              <CardDescription>Case unlocked · {new Date(triage.claimed_at ?? triage.created_at).toLocaleString()}</CardDescription>
            </div>
            <Badge className="bg-primary text-white">
              {safetyEmoji(rep?.safety_level ?? null)} {safetyLabel(rep?.safety_level ?? null)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <div className="text-xs uppercase text-muted-foreground">Latest vitals</div>
            <div className="mt-1 text-sm">HR: <span className="font-semibold">{rep?.vitals?.hr ?? "—"} bpm</span></div>
            <div className="text-sm">BP: <span className="font-semibold">{rep?.vitals?.bp ?? "—"}</span></div>
            {rep?.vitals?.measured_at && (
              <div className="mt-1 text-xs text-muted-foreground">as of {new Date(rep.vitals.measured_at).toLocaleString()}</div>
            )}
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs uppercase text-muted-foreground">Recent herbal intake</div>
            {(rep?.herbal_intake ?? []).length === 0 ? (
              <div className="mt-1 text-sm text-muted-foreground">None logged in the last 5 doses.</div>
            ) : (
              <ul className="mt-1 space-y-1 text-sm">
                {rep!.herbal_intake.map((h, i) => (
                  <li key={i}>• {h.name}{h.dose ? ` — ${h.dose}` : ""}</li>
                ))}
              </ul>
            )}
          </div>
          {rep?.safety_summary && (
            <div className="rounded-lg border bg-primary/5 p-3 sm:col-span-2">
              <div className="text-xs uppercase text-primary">Safety summary</div>
              <div className="mt-1 text-sm">{rep.safety_summary}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onConclude} className="sm:w-auto">
          Conclude &amp; route to pharmacy →
        </Button>
      </div>
    </div>
  );
}

// ------------------------- Pharmacy discovery + prescription -------------------------
function PharmacyDiscovery({
  triage, onSelected, onCancel,
}: {
  triage: TriageSession;
  onSelected: (h: PharmacyHandoff) => void;
  onCancel: () => void;
}) {
  const [pharmacies, setPharmacies] = useState<Array<Pharmacy & { km?: number }>>([]);
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [prescriptionOpen, setPrescriptionOpen] = useState<Pharmacy | null>(null);
  const [creating, setCreating] = useState(false);
  const [rxDrug, setRxDrug] = useState("");
  const [rxDose, setRxDose] = useState("");
  const [rxFreq, setRxFreq] = useState("");
  const [rxDuration, setRxDuration] = useState("");
  const [rxNote, setRxNote] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const loc = await getUserLocation();
      setOrigin(loc);
      const all = await fetchOnlinePharmacies();
      const withDistance = all
        .filter((p) => p.lat != null && p.lng != null)
        .map((p) => ({ ...p, km: distanceKm(loc, { lat: p.lat!, lng: p.lng! }) }))
        .sort((a, b) => (a.km ?? 999) - (b.km ?? 999));
      setPharmacies(withDistance);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return pharmacies;
    const q = search.toLowerCase();
    return pharmacies.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.address ?? "").toLowerCase().includes(q),
    );
  }, [pharmacies, search]);

  async function initiateHandoff() {
    if (!prescriptionOpen) return;
    setCreating(true);
    try {
      await concludeTriage(triage.id);
      const rx: Prescription = {
        items: rxDrug ? [{ drug: rxDrug, dose: rxDose, frequency: rxFreq, duration: rxDuration, notes: rxNote || undefined }] : [],
        clinical_note: rxNote || "",
      };
      const handoff = await createPharmacyHandoff({
        triage,
        pharmacyId: prescriptionOpen.id,
        pharmacistUserId: prescriptionOpen.owner_user_id,
        prescription: rx,
      });
      toast.success(`Handoff sent to ${prescriptionOpen.name}`);
      onSelected(handoff);
    } catch (e: any) {
      toast.error(e.message ?? "Could not create handoff.");
    } finally { setCreating(false); }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[3fr,2fr]">
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-primary" /> Nearby on-duty pharmacies
          </CardTitle>
          <CardDescription>Based on patient's approximate location.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Enter landmark or pharmacy name…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="h-56 w-full overflow-hidden rounded-lg border">
            {origin && (
              <iframe
                title="Pharmacy map"
                className="h-full w-full"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${origin.lng - 0.05},${origin.lat - 0.05},${origin.lng + 0.05},${origin.lat + 0.05}&layer=mapnik&marker=${origin.lat},${origin.lng}`}
              />
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="max-h-[70vh] overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">On duty now</CardTitle>
          <CardDescription>{filtered.length} pharmacies available</CardDescription>
        </CardHeader>
        <CardContent className="max-h-[52vh] space-y-2 overflow-y-auto p-3">
          {loading ? (
            <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Locating…</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No on-duty pharmacies match. Try a different landmark.
            </div>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => setPrescriptionOpen(p)}
                className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition hover:border-primary/50 hover:bg-primary/5"
              >
                <div className="mt-0.5 h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.address ?? "—"}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-700">Active on duty</Badge>
                    {typeof p.km === "number" && <span className="text-muted-foreground">{p.km.toFixed(1)} km</span>}
                  </div>
                </div>
              </button>
            ))
          )}
        </CardContent>
        <div className="border-t p-3">
          <Button variant="ghost" size="sm" onClick={onCancel} className="w-full">
            <X className="mr-2 h-4 w-4" /> Back to case
          </Button>
        </div>
      </Card>

      <Dialog open={!!prescriptionOpen} onOpenChange={(o) => !o && setPrescriptionOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pill className="h-4 w-4" /> Prescribe & route</DialogTitle>
            <DialogDescription>
              Sending case to <b>{prescriptionOpen?.name}</b>. Add the medication and clinical note to open the pharmacist chat.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium">Drug</label>
                <Input value={rxDrug} onChange={(e) => setRxDrug(e.target.value)} placeholder="e.g. Amoxicillin" />
              </div>
              <div>
                <label className="text-xs font-medium">Dose</label>
                <Input value={rxDose} onChange={(e) => setRxDose(e.target.value)} placeholder="500 mg" />
              </div>
              <div>
                <label className="text-xs font-medium">Frequency</label>
                <Input value={rxFreq} onChange={(e) => setRxFreq(e.target.value)} placeholder="3× daily" />
              </div>
              <div>
                <label className="text-xs font-medium">Duration</label>
                <Input value={rxDuration} onChange={(e) => setRxDuration(e.target.value)} placeholder="5 days" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">Clinical note for pharmacist &amp; patient</label>
              <Textarea value={rxNote} onChange={(e) => setRxNote(e.target.value)} rows={3}
                placeholder="Watch for herb-drug interaction; take with food…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrescriptionOpen(null)} disabled={creating}>Cancel</Button>
            <Button onClick={initiateHandoff} disabled={creating}>
              {creating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Routing…</> : <>Send to pharmacy →</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ------------------------- Doctor/Pharmacist ephemeral chat -------------------------
export function ClinicianChat({
  handoff, role, doctorName, onExit,
}: {
  handoff: PharmacyHandoff;
  role: "doctor" | "pharmacist";
  doctorName?: string;
  onExit: () => void;
}) {
  const [messages, setMessages] = useState<DoctorPharmacistMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [patientName, setPatientName] = useState("Patient");
  const [pharmacyName, setPharmacyName] = useState("Pharmacy");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState<PharmacyHandoff>(handoff);
  const rep = current.interaction_report;

  useEffect(() => {
    (async () => {
      const list = await fetchHandoffMessages(handoff.id);
      setMessages(list);
      const [pt, ph] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("user_id", handoff.patient_id).maybeSingle(),
        supabase.from("pharmacies" as any).select("name").eq("id", handoff.pharmacy_id).maybeSingle(),
      ]);
      setPatientName((pt.data as any)?.display_name ?? "Patient");
      setPharmacyName((ph.data as any)?.name ?? "Pharmacy");
      // Auto-inject clinical context as first system message (once per session).
      if (list.length === 0) {
        await sendHandoffMessage({
          handoffId: handoff.id, role: "system",
          body: `📋 Clinical context injected — Safety ${safetyLabel(rep?.safety_level ?? null)} · HR ${rep?.vitals?.hr ?? "—"} bpm · BP ${rep?.vitals?.bp ?? "—"} · Herbs: ${(rep?.herbal_intake ?? []).map((h) => h.name).join(", ") || "none"}`,
        });
      }
    })();
  }, [handoff.id]);

  useEffect(() => {
    const ch = supabase.channel("dpm-" + handoff.id)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "doctor_pharmacist_messages", filter: `handoff_id=eq.${handoff.id}` },
        (p: any) => setMessages((m) => [...m, p.new as DoctorPharmacistMessage]))
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "pharmacy_handoffs", filter: `id=eq.${handoff.id}` },
        (p: any) => setCurrent(p.new as PharmacyHandoff))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [handoff.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    if (!input.trim()) return;
    setSending(true);
    try {
      await sendHandoffMessage({ handoffId: handoff.id, role, body: input.trim() });
      setInput("");
    } catch (e: any) { toast.error(e.message); } finally { setSending(false); }
  }

  async function finalizeAndGeneratePdfs() {
    setFinishing(true);
    try {
      // Refresh state, then mark dispensed (pharmacist) OR ready (doctor)
      if (role === "pharmacist") {
        await supabase.from("pharmacy_handoffs")
          .update({ status: "dispensed", dispensed_at: new Date().toISOString() })
          .eq("id", handoff.id);
      } else {
        await supabase.from("pharmacy_handoffs")
          .update({ status: "ready", ready_at: new Date().toISOString() })
          .eq("id", handoff.id);
      }
      const fresh = await fetchHandoffById(handoff.id) ?? current;
      const transcript = await fetchHandoffMessages(handoff.id);
      const patientBlob = buildPatientPdf(fresh, pharmacyName, doctorName ?? "Doctor");
      const clinicalBlob = buildClinicalPdf({
        handoff: fresh, pharmacyName, doctorName: doctorName ?? "Doctor",
        patientName, transcript,
      });
      await Promise.all([
        uploadAndRegisterPdf({ handoffId: handoff.id, kind: "patient", blob: patientBlob }),
        uploadAndRegisterPdf({ handoffId: handoff.id, kind: "clinical", blob: clinicalBlob }),
      ]);
      toast.success("Dual PDFs generated and filed.");
      onExit();
    } catch (e: any) {
      toast.error(e.message ?? "Could not finalise handoff.");
    } finally { setFinishing(false); }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-primary/5 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Radio className="h-4 w-4 text-primary" />
              Doctor ↔ Pharmacist · {patientName}
            </CardTitle>
            <CardDescription className="text-xs">
              {pharmacyName} · Dispense PIN <span className="font-mono font-semibold">{current.dispense_pin}</span> ·
              Safety {safetyEmoji(rep?.safety_level ?? null)} {safetyLabel(rep?.safety_level ?? null)}
            </CardDescription>
          </div>
          <Badge variant="outline">{current.status}</Badge>
        </div>
      </CardHeader>

      <div ref={scrollRef} className="h-[52vh] space-y-2 overflow-y-auto bg-muted/30 p-4">
        {messages.map((m) => (
          <MessageBubble key={m.id} m={m} me={role} />
        ))}
      </div>

      <div className="border-t p-3">
        <div className="flex gap-2">
          <Input
            value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="Message the other clinician…"
            disabled={sending || current.status === "dispensed"}
          />
          <Button onClick={send} disabled={sending || !input.trim() || current.status === "dispensed"}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {role === "doctor" && current.status !== "ready" && current.status !== "dispensed" && (
            <Button variant="secondary" size="sm" onClick={finalizeAndGeneratePdfs} disabled={finishing}>
              {finishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              Mark ready &amp; file PDFs
            </Button>
          )}
          {role === "pharmacist" && current.status !== "dispensed" && (
            <Button size="sm" onClick={finalizeAndGeneratePdfs} disabled={finishing}>
              {finishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Dispense complete &amp; generate PDFs
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onExit} className="ml-auto">Close chat</Button>
        </div>
      </div>
    </Card>
  );
}

function MessageBubble({ m, me }: { m: DoctorPharmacistMessage; me: "doctor" | "pharmacist" }) {
  if (m.sender_role === "system") {
    return (
      <div className="mx-auto max-w-[85%] rounded-md border border-primary/30 bg-primary/5 p-2 text-center text-[11px] text-primary">
        {m.body}
      </div>
    );
  }
  const isMe = m.sender_role === me;
  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
        isMe ? "bg-primary text-white" : "bg-white text-foreground"
      }`}>
        <div className="text-[10px] uppercase opacity-70">{m.sender_role}</div>
        <div className="whitespace-pre-wrap">{m.body}</div>
        <div className={`mt-1 text-[10px] ${isMe ? "text-white/70" : "text-muted-foreground"}`}>
          {new Date(m.created_at).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
