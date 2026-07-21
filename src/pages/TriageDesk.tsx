// Doctor's Clinical Desk — Live Triage Command Center
// - Real-time anonymized patient queue (Supabase subscription)
// - "Request Connection" with optimistic UI lock (row disappears for other doctors)
// - Consultation unlocks after the patient accepts (RLS unlocks report)
// - Conclude with optional 72-hour follow-up ticket
// - Pharmacy handoff + ephemeral doctor↔pharmacist chat preserved
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2, ShieldCheck, ArrowLeft, Stethoscope, MapPin, Send, X, FileText,
  Users, Search, Pill, Radio, CheckCircle2, Activity, TicketCheck, Signal,
} from "lucide-react";
import {
  fetchQueue, requestTriage, fetchDoctorActiveTriages, fetchTriageById, fetchTriageReport,
  concludeTriage, issueFollowupToken,
  createPharmacyHandoff, fetchHandoffById, fetchHandoffMessages, sendHandoffMessage,
  buildClinicalPdf, buildPatientPdf, uploadAndRegisterPdf,
  type TriageSession, type PharmacyHandoff, type DoctorPharmacistMessage, type Prescription,
} from "@/lib/triage";
import type { InteractionReport } from "@/lib/telepharmacy";
import {
  fetchOnlinePharmacies, distanceKm, getUserLocation, safetyEmoji, safetyLabel,
  type Pharmacy,
} from "@/lib/telepharmacy";
import { fetchProviderStatus, type ProviderStatus } from "@/lib/providerAuth";
import { useI18n } from "@/lib/i18n";
import "@/styles/clinical.css";

export default function TriageDesk() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [queue, setQueue] = useState<TriageSession[]>([]);
  const [myActive, setMyActive] = useState<TriageSession[]>([]);
  const [pendingRequestIds, setPendingRequestIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<"desk" | "consult" | "pharmacy" | "chat">("desk");
  const [activeTriage, setActiveTriage] = useState<TriageSession | null>(null);
  const [activeReport, setActiveReport] = useState<InteractionReport | null>(null);
  const [activeHandoff, setActiveHandoff] = useState<PharmacyHandoff | null>(null);
  const doctorIdRef = useRef<string | null>(null);
  const doctorNameRef = useRef<string>("Doctor");

  const refresh = useCallback(async () => {
    setQueue(await fetchQueue());
    setMyActive(await fetchDoctorActiveTriages());
  }, []);

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
      await refresh();
    })();
  }, [navigate, refresh]);

  // Realtime: watch the whole triage_sessions table — RLS filters to waiting + my rows.
  useEffect(() => {
    const uid = doctorIdRef.current;
    if (!uid) return;
    const ch = supabase.channel("doctor-desk-live-" + uid)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "triage_sessions" },
        async (p: any) => {
          const row = (p.new ?? p.old) as TriageSession | undefined;
          if (!row) return;
          // If a patient accepted my request -> auto-open consultation
          if (row.doctor_id === uid && row.patient_accepted_at && row.status === "claimed") {
            const rep = await fetchTriageReport(row.id);
            setActiveTriage(row);
            setActiveReport(rep);
            setActiveHandoff(null);
            setView("consult");
            toast.success("Patient accepted — case unlocked.");
          }
          await refresh();
          setPendingRequestIds((prev) => {
            // Clear optimistic lock once server-state reflects the change
            const next = new Set(prev);
            if (row.status !== "waiting" || row.requested_by) next.delete(row.id);
            return next;
          });
        })
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "pharmacy_handoffs", filter: `doctor_id=eq.${uid}` },
        (p: any) => {
          if (activeHandoff && p.new?.id === activeHandoff.id) setActiveHandoff(p.new as PharmacyHandoff);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [refresh, activeHandoff?.id]);

  async function handleRequest(session: TriageSession) {
    // Optimistic lock -> hide card immediately
    setPendingRequestIds((s) => new Set(s).add(session.id));
    setQueue((q) => q.filter((r) => r.id !== session.id));
    try {
      await requestTriage(session.id);
      toast.success(`Request sent — waiting for patient to accept.`);
    } catch (e: any) {
      setPendingRequestIds((s) => { const n = new Set(s); n.delete(session.id); return n; });
      await refresh();
      toast.error(e.message ?? "Could not request patient — likely already taken.");
    }
  }

  async function openMyActive(t: TriageSession) {
    setActiveTriage(t);
    setActiveReport(await fetchTriageReport(t.id));
    setActiveHandoff(null);
    setView("consult");
  }

  // Visible queue = server queue + our pending requests (hidden), so we can display "Waiting for patient" chips.
  const visibleQueue = useMemo(() => queue, [queue]);

  return (
    <div className="theme-clinical min-h-screen bg-gradient-to-b from-clinical-bg to-clinical-bg-soft pb-16">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="container flex items-center gap-3 py-3">
          {view !== "desk" ? (
            <Button variant="ghost" size="sm" onClick={() => setView("desk")}>
              <ArrowLeft className="mr-1 h-4 w-4" /> {t("desk.title")}
            </Button>
          ) : (
            <>
              <div className="rounded-md bg-primary/10 p-2 text-primary"><Stethoscope className="h-5 w-5" /></div>
              <div>
                <div className="text-sm font-semibold">{t("desk.title")}</div>
                <div className="text-xs text-muted-foreground">{providerStatus?.hospitalName ?? "Verifying…"}</div>
              </div>
              <Badge variant="outline" className="ml-auto border-primary/40 bg-primary/5 text-primary">
                Dr. {doctorNameRef.current}
              </Badge>
            </>
          )}
        </div>
      </header>

      <main className="container max-w-6xl space-y-6 py-6">
        {view === "desk" && (
          <>
            {/* Hero pulse */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-600 via-sky-500 to-teal-500 p-6 text-white shadow-lg">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex items-center gap-3">
                <div className="rounded-lg bg-white/15 p-2"><Activity className="h-6 w-6" /></div>
                <div>
                  <div className="text-xs uppercase tracking-widest opacity-80">Live</div>
                  <div className="font-display text-2xl leading-tight">Triage Command Center</div>
                </div>
                <div className="ml-auto flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs">
                  <Signal className="h-3.5 w-3.5" /> {visibleQueue.length + pendingRequestIds.size} in queue
                </div>
              </div>
            </div>

            {/* LIVE QUEUE */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-primary" /> {t("desk.queue")}
                </CardTitle>
                <CardDescription>Anonymized — names & medical detail remain locked until the patient accepts your request.</CardDescription>
              </CardHeader>
              <CardContent>
                {visibleQueue.length === 0 && pendingRequestIds.size === 0 ? (
                  <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                    {t("desk.queue.empty")}
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {visibleQueue.map((s) => (
                      <div key={s.id}
                        className="group relative overflow-hidden rounded-xl border bg-card p-4 transition hover:border-primary/60 hover:shadow-md">
                        <div className="mb-2 flex items-center justify-between">
                          <Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary">
                            {s.symptom_category ?? "General"}
                          </Badge>
                          <span className="text-[10px] uppercase text-muted-foreground">
                            {timeAgo(s.created_at)}
                          </span>
                        </div>
                        <div className="mb-3 flex items-center gap-3 text-sm">
                          <div><span className="text-muted-foreground">Age</span>{" "}<b>{s.age_band ?? "—"}</b></div>
                          <div className="h-3 w-px bg-border" />
                          <div><span className="text-muted-foreground">Gender</span>{" "}<b>{s.gender ?? "—"}</b></div>
                        </div>
                        <Button size="sm" className="w-full" onClick={() => handleRequest(s)}>
                          <Stethoscope className="mr-2 h-3.5 w-3.5" /> {t("desk.request")}
                        </Button>
                      </div>
                    ))}
                    {[...pendingRequestIds].map((id) => (
                      <div key={id} className="rounded-xl border border-dashed bg-muted/40 p-4 text-center text-xs text-muted-foreground">
                        <Loader2 className="mx-auto mb-1 h-4 w-4 animate-spin" />
                        {t("desk.requested")}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* MY ACTIVE CONSULTATIONS */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4 text-primary" /> {t("desk.myactive")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {myActive.length === 0 ? (
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Accept a patient from the queue to begin.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {myActive.map((s) => (
                      <button key={s.id} onClick={() => openMyActive(s)}
                        className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition hover:border-primary/50 hover:bg-primary/5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Stethoscope className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{s.symptom_category ?? "Consultation"} · Age {s.age_band}, {s.gender}</div>
                          <div className="text-xs text-muted-foreground">Opened {new Date(s.claimed_at ?? s.created_at).toLocaleTimeString()}</div>
                        </div>
                        <Badge variant="outline">{t("desk.consult")} →</Badge>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {view === "consult" && activeTriage && (
          <ConsultationView
            triage={activeTriage}
            report={activeReport}
            onConclude={() => setView("pharmacy")}
            doctorName={doctorNameRef.current}
            onFinished={async () => { setActiveTriage(null); setActiveReport(null); setView("desk"); await refresh(); }}
          />
        )}

        {view === "pharmacy" && activeTriage && (
          <PharmacyDiscovery
            triage={activeTriage}
            report={activeReport}
            onSelected={async (handoff) => { setActiveHandoff(handoff); setView("chat"); }}
            onCancel={() => setView("consult")}
          />
        )}

        {view === "chat" && activeHandoff && (
          <ClinicianChat
            handoff={activeHandoff}
            role="doctor"
            doctorName={doctorNameRef.current}
            onExit={() => { setView("desk"); setActiveTriage(null); setActiveReport(null); setActiveHandoff(null); refresh(); }}
          />
        )}
      </main>
    </div>
  );
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

// ------------------------- Consultation view -------------------------
function ConsultationView({
  triage, report, onConclude, doctorName, onFinished,
}: {
  triage: TriageSession;
  report: InteractionReport | null;
  onConclude: () => void;
  doctorName: string;
  onFinished: () => void;
}) {
  const { t } = useI18n();
  const [issueTicket, setIssueTicket] = useState(false);
  const [ending, setEnding] = useState(false);

  async function endConsult() {
    setEnding(true);
    try {
      await concludeTriage(triage.id);
      if (issueTicket) {
        await issueFollowupToken(triage.id, 72);
        toast.success(t("followup.issued"));
      }
      toast.success("Consultation concluded.");
      onFinished();
    } catch (e: any) {
      toast.error(e.message ?? "Could not conclude.");
    } finally { setEnding(false); }
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                {triage.symptom_category ?? "Patient"} · Age {triage.age_band}, {triage.gender}
              </CardTitle>
              <CardDescription>Case unlocked · {new Date(triage.claimed_at ?? triage.created_at).toLocaleString()}</CardDescription>
            </div>
            <Badge className="bg-primary text-white">
              {safetyEmoji(report?.safety_level ?? null)} {safetyLabel(report?.safety_level ?? null)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <div className="text-xs uppercase text-muted-foreground">Latest vitals</div>
            <div className="mt-1 text-sm">HR: <span className="font-semibold">{report?.vitals?.hr ?? "—"} bpm</span></div>
            <div className="text-sm">BP: <span className="font-semibold">{report?.vitals?.bp ?? "—"}</span></div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs uppercase text-muted-foreground">Recent herbal intake</div>
            {(report?.herbal_intake ?? []).length === 0 ? (
              <div className="mt-1 text-sm text-muted-foreground">None logged.</div>
            ) : (
              <ul className="mt-1 space-y-1 text-sm">
                {report!.herbal_intake.map((h, i) => (
                  <li key={i}>• {h.name}{h.dose ? ` — ${h.dose}` : ""}</li>
                ))}
              </ul>
            )}
          </div>
          {report?.safety_summary && (
            <div className="rounded-lg border bg-primary/5 p-3 sm:col-span-2">
              <div className="text-xs uppercase text-primary">Safety summary</div>
              <div className="mt-1 text-sm">{report.safety_summary}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <Switch id="ticket" checked={issueTicket} onCheckedChange={setIssueTicket} />
            <Label htmlFor="ticket" className="flex items-center gap-2 text-sm">
              <TicketCheck className="h-4 w-4 text-emerald-600" />
              {t("followup.issue")}
            </Label>
          </div>
          <div className="sm:ml-auto flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={endConsult} disabled={ending}>
              {ending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              End consultation
            </Button>
            <Button onClick={onConclude}>Send to pharmacy →</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ------------------------- Pharmacy discovery + prescription -------------------------
function PharmacyDiscovery({
  triage, report, onSelected, onCancel,
}: {
  triage: TriageSession;
  report: InteractionReport | null;
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
        interactionReport: report,
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
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Enter landmark or pharmacy name…"
              value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="h-56 w-full overflow-hidden rounded-lg border">
            {origin && (
              <iframe title="Pharmacy map" className="h-full w-full"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${origin.lng - 0.05},${origin.lat - 0.05},${origin.lng + 0.05},${origin.lat + 0.05}&layer=mapnik&marker=${origin.lat},${origin.lng}`} />
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
              No on-duty pharmacies match.
            </div>
          ) : (
            filtered.map((p) => (
              <button key={p.id} onClick={() => setPrescriptionOpen(p)}
                className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition hover:border-primary/50 hover:bg-primary/5">
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
              Sending case to <b>{prescriptionOpen?.name}</b>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs font-medium">Drug</label>
                <Input value={rxDrug} onChange={(e) => setRxDrug(e.target.value)} placeholder="e.g. Amoxicillin" /></div>
              <div><label className="text-xs font-medium">Dose</label>
                <Input value={rxDose} onChange={(e) => setRxDose(e.target.value)} placeholder="500 mg" /></div>
              <div><label className="text-xs font-medium">Frequency</label>
                <Input value={rxFreq} onChange={(e) => setRxFreq(e.target.value)} placeholder="3× daily" /></div>
              <div><label className="text-xs font-medium">Duration</label>
                <Input value={rxDuration} onChange={(e) => setRxDuration(e.target.value)} placeholder="5 days" /></div>
            </div>
            <div><label className="text-xs font-medium">Clinical note for pharmacist &amp; patient</label>
              <Textarea value={rxNote} onChange={(e) => setRxNote(e.target.value)} rows={3}
                placeholder="Watch for herb-drug interaction; take with food…" /></div>
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
        handoff: fresh, pharmacyName, doctorName: doctorName ?? "Doctor", patientName, transcript,
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
        {messages.map((m) => (<MessageBubble key={m.id} m={m} me={role} />))}
      </div>

      <div className="border-t p-3">
        <div className="flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="Message the other clinician…"
            disabled={sending || current.status === "dispensed"} />
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
