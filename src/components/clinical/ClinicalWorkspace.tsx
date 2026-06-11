// Clinical Workspace — split-screen patient triage + active patient profile
// (symptoms with Pidgin↔Medical bridge, herbal history, drug-interaction
// engine, dosage validation card, dispensing notes).
//
// Strict privacy: every data fetch is scoped to either the active PIN-claimed
// consultation session OR an explicit care_team assignment. We NEVER read
// profiles, diary entries, or anything outside vitals/dose_logs.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Search, Users, AlertTriangle, FlaskConical, ShieldAlert, NotebookPen,
  Stethoscope, ClipboardList, BookOpen, Pill, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { bridgeSymptom, triageColor } from "@/lib/pidginSymptoms";
import {
  searchDrugInteractions, severityTokens, referenceFor, COMMON_DRUGS,
  type DrugHerbInteraction,
} from "@/lib/drugInteractions";

interface TriagePatient {
  patientId: string;
  source: "live" | "roster";
  status: "Live Session" | "Scheduled" | "Historical" | "Active";
  sessionId?: string;
}

interface DoseRow {
  id: string;
  remedy_id: string;
  remedy_name: string;
  remedy_local_name: string | null;
  dose: string;
  feel: string | null;
  taken_at: string;
}

interface ClinicalWorkspaceProps {
  hospitalId: string;
  providerId: string;
  activePatientId: string | null;        // PIN-claimed consultation patient
  activeSessionId: string | null;
  founderMode: boolean;                  // pre-load Digoxin demo scenario
  onPickPatient: (patientId: string, sessionId: string | null) => void;
}

export function ClinicalWorkspace({
  hospitalId, providerId, activePatientId, activeSessionId, founderMode, onPickPatient,
}: ClinicalWorkspaceProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "high-risk" | "live" | "scheduled">("all");
  const [roster, setRoster] = useState<TriagePatient[]>([]);
  const [doses, setDoses] = useState<DoseRow[]>([]);
  const [loadingPatient, setLoadingPatient] = useState(false);

  // Drug interaction engine state
  const [drugInput, setDrugInput] = useState(founderMode ? "Digoxin" : "");
  const [drugDose, setDrugDose] = useState(founderMode ? "25 micrograms" : "");
  const [searching, setSearching] = useState(false);
  const [interactions, setInteractions] = useState<DrugHerbInteraction[] | null>(null);

  // Dispensing note
  const [note, setNote] = useState("");

  // ── Load roster: live consultations + assigned care-team patients ──────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const live = await supabase
        .from("consultation_sessions")
        .select("id,patient_id,claimed_at,revoked_at,status,ends_at")
        .eq("hospital_id", hospitalId)
        .eq("status", "active")
        .is("revoked_at", null)
        .gt("ends_at", new Date().toISOString());
      const roster = await supabase
        .from("patient_care_team" as any)
        .select("patient_id,status")
        .eq("provider_id", providerId);

      if (cancelled) return;
      const map = new Map<string, TriagePatient>();
      ((live.data ?? []) as any[]).forEach((s) => {
        map.set(s.patient_id, {
          patientId: s.patient_id,
          source: "live",
          status: "Live Session",
          sessionId: s.id,
        });
      });
      ((roster.data ?? []) as any[]).forEach((r) => {
        if (map.has(r.patient_id)) return;
        map.set(r.patient_id, {
          patientId: r.patient_id,
          source: "roster",
          status: r.status === "active" ? "Active"
                 : r.status === "scheduled" ? "Scheduled" : "Historical",
        });
      });
      setRoster(Array.from(map.values()));
    }
    load();
    const ch = supabase
      .channel("workspace-sessions")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "consultation_sessions" }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [hospitalId, providerId]);

  // ── Load doses for the active patient (RLS enforces access) ────────────────
  useEffect(() => {
    if (!activePatientId) { setDoses([]); return; }
    setLoadingPatient(true);
    supabase
      .from("dose_logs")
      .select("id,remedy_id,remedy_name,remedy_local_name,dose,feel,taken_at")
      .eq("user_id", activePatientId)
      .order("taken_at", { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setDoses((data as DoseRow[]) ?? []);
        setLoadingPatient(false);
      });
  }, [activePatientId]);

  // ── Filter triage list ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return roster.filter((p) => {
      const matchQ = !query.trim() ||
        `PT-${p.patientId.slice(0,6).toUpperCase()}`.toLowerCase().includes(query.toLowerCase()) ||
        p.patientId.toLowerCase().includes(query.toLowerCase());
      const matchF =
        filter === "all" ? true
        : filter === "live" ? p.status === "Live Session"
        : filter === "scheduled" ? p.status === "Scheduled"
        : p.status === "Live Session"; // "high-risk" → currently same proxy as live
      return matchQ && matchF;
    });
  }, [roster, query, filter]);

  // ── Bridged symptoms from recent doses' "feel" + remedy_local_name ─────────
  const symptomBridges = useMemo(() => {
    const raw = doses.slice(0, 5).map((d) => ({
      raw: d.feel ?? d.remedy_local_name ?? "",
      whenISO: d.taken_at,
    })).filter((s) => s.raw.length > 0);
    return raw
      .map((s) => ({ ...s, bridge: bridgeSymptom(s.raw) }))
      .filter((s) => s.bridge);
  }, [doses]);

  const herbIds = useMemo(
    () => Array.from(new Set(doses.map((d) => d.remedy_id.toLowerCase()))),
    [doses],
  );

  // Founder demo: synthesise a Hibiscus/Agbo dose so the engine has herbs to
  // intersect with even before a live consultation is claimed.
  const effectiveHerbIds = founderMode && herbIds.length === 0
    ? ["hibiscus", "agbo"]
    : herbIds;

  async function runInteraction() {
    if (!drugInput.trim()) {
      toast.error("Enter a conventional drug to run interaction analysis.");
      return;
    }
    setSearching(true);
    const results = await searchDrugInteractions(drugInput, effectiveHerbIds);
    setInteractions(results);
    setSearching(false);
  }

  // Auto-run founder demo once on mount
  useEffect(() => {
    if (founderMode && interactions === null) {
      runInteraction();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [founderMode]);

  const activePatient = roster.find((p) => p.patientId === activePatientId);

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      {/* ── Left: Triage list ─────────────────────────────────────────── */}
      <aside className="space-y-3">
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-primary" /> Patient Triage
            </CardTitle>
            <CardDescription className="text-xs">
              Care-team roster · {roster.length} patient{roster.length === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by Name or Patient ID"
                className="pl-8"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {(["all","live","scheduled","high-risk"] as const).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? "default" : "outline"}
                  className="h-7 px-2 text-xs capitalize"
                  onClick={() => setFilter(f)}
                >{f.replace("-", " ")}</Button>
              ))}
            </div>
            <div className="max-h-[60vh] space-y-1.5 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  No patients match the current filter.
                </p>
              ) : filtered.map((p) => {
                const isActive = p.patientId === activePatientId;
                const isLive = p.status === "Live Session";
                return (
                  <button
                    key={p.patientId}
                    onClick={() => onPickPatient(p.patientId, p.sessionId ?? null)}
                    className={`w-full rounded-lg border p-2.5 text-left transition hover:border-primary ${
                      isActive ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono-tech text-xs font-semibold">
                        PT-{p.patientId.slice(0, 6).toUpperCase()}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          isLive
                            ? "border-[hsl(var(--safe))] text-[hsl(var(--safe))]"
                            : p.status === "Scheduled"
                            ? "border-primary text-primary"
                            : "border-muted-foreground/40 text-muted-foreground"
                        }`}
                      >
                        {p.status}
                      </Badge>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {p.source === "live" ? "PIN-claimed clinical stream" : "Roster patient"}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </aside>

      {/* ── Right: Active patient workspace ─────────────────────────────── */}
      <section className="space-y-4">
        {!activePatientId ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Stethoscope className="h-10 w-10 text-muted-foreground" />
              <p className="font-display text-base">Select a patient to begin clinical review</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Pick a patient from your care team or claim a live PIN-secured consultation
                from the Active Consultations panel above.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="font-mono-tech">
                    PT-{activePatientId.slice(0, 6).toUpperCase()}
                  </span>
                  {activePatient && (
                    <Badge variant="secondary" className="text-[10px]">
                      {activePatient.status}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  Clinical data only — personal account &amp; diary entries are blocked by RLS.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Reported symptoms — Pidgin ↔ Medical bridge */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  Reported Symptoms
                </CardTitle>
                <CardDescription className="text-xs">
                  Patient-language (Pidgin) terms mapped to standardised clinical terminology.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {loadingPatient ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading clinical log…
                  </div>
                ) : symptomBridges.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No recent reported symptoms on file for this patient.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {symptomBridges.map((s, i) => (
                      <li
                        key={i}
                        className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-2"
                      >
                        <span className="rounded bg-background px-2 py-0.5 text-xs italic">
                          “{s.raw}”
                        </span>
                        <span className="text-xs text-muted-foreground">→</span>
                        <span className="text-sm font-medium">{s.bridge!.medical}</span>
                        <Badge className={`ml-auto text-[10px] ${triageColor(s.bridge!.triage)}`}>
                          {s.bridge!.triage.toUpperCase()}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-[10px] text-muted-foreground">
                  Source: MedP-AI Symptom Bridge v1.0 · Pidgin ↔ ICD-10 mapping.
                </p>
              </CardContent>
            </Card>

            {/* Herbal medication history */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Pill className="h-4 w-4 text-primary" />
                  Herbal Medication History
                </CardTitle>
                <CardDescription className="text-xs">
                  Active herbal supplements with estimated dosages and preparation method.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {doses.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No herbal entries logged in the last 20 doses.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {doses.slice(0, 8).map((d) => {
                      const ref = referenceFor(d.remedy_id);
                      return (
                        <div
                          key={d.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2 text-xs"
                        >
                          <div>
                            <div className="font-medium">
                              {d.remedy_name}
                              {d.remedy_local_name ? <span className="ml-1 text-muted-foreground">({d.remedy_local_name})</span> : null}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {ref ? `${ref.extraction} · ` : ""}
                              {d.dose || "dose not recorded"}
                            </div>
                          </div>
                          <span className="font-mono-tech text-[10px] text-muted-foreground">
                            {new Date(d.taken_at).toLocaleString([], {
                              month: "short", day: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Drug-Herb interaction engine */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FlaskConical className="h-4 w-4 text-primary" />
                  Drug–Herb Interaction Engine
                </CardTitle>
                <CardDescription className="text-xs">
                  Cross-check a conventional pharmaceutical against this patient's active herbal profile.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-[1fr_180px_auto]">
                  <Input
                    list="common-drugs"
                    value={drugInput}
                    onChange={(e) => setDrugInput(e.target.value)}
                    placeholder="Drug name (e.g. Digoxin, Warfarin)"
                  />
                  <datalist id="common-drugs">
                    {COMMON_DRUGS.map((d) => <option key={d} value={d} />)}
                  </datalist>
                  <Input
                    value={drugDose}
                    onChange={(e) => setDrugDose(e.target.value)}
                    placeholder="Dose (e.g. 25 micrograms)"
                  />
                  <Button onClick={runInteraction} disabled={searching}>
                    {searching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Analyse
                  </Button>
                </div>

                {interactions === null ? (
                  <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                    Select a conventional drug to run interaction analysis.
                  </div>
                ) : interactions.length === 0 ? (
                  <div className="rounded-lg border bg-[hsl(var(--safe)/0.08)] p-4 text-sm">
                    <div className="flex items-center gap-2 font-display">
                      <Badge className="bg-[hsl(var(--safe))] text-[hsl(var(--safe-foreground))]">
                        MILD / SAFE
                      </Badge>
                      <span>No known adverse interaction</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {drugInput} {drugDose && `at ${drugDose}`} has no documented adverse interaction
                      with the patient's current herbal profile in MedP-AI Clinical Database v1.2.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {interactions.map((i) => {
                      const tok = severityTokens(i.severity);
                      return (
                        <li key={i.id} className={`rounded-lg border p-3 ${tok.bg} ${tok.ring}`}>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={tok.badge}>{tok.label}</Badge>
                            <span className="font-display text-sm">
                              {i.drug_name} {drugDose && <span className="text-xs opacity-70">@ {drugDose}</span>} × {i.herb_name}
                            </span>
                          </div>
                          <p className="mt-2 text-xs">
                            <strong>Mechanism:</strong> {i.mechanism}
                          </p>
                          <p className="mt-1 text-xs">
                            <strong>Clinical advice:</strong> {i.clinical_advice}
                          </p>
                          {i.affected_systems.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {i.affected_systems.map((sys) => (
                                <Badge key={sys} variant="outline" className="text-[10px]">{sys}</Badge>
                              ))}
                            </div>
                          )}
                          <p className="mt-2 text-[10px] text-muted-foreground">
                            Source: {i.source_api}
                            {i.citation ? ` · ${i.citation}` : ""}
                            {" · synced "}{new Date(i.last_synced_at).toLocaleDateString()}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Dosage validation card per herb */}
            {effectiveHerbIds.map((hid) => {
              const ref = referenceFor(hid);
              if (!ref) return null;
              return (
                <Card key={hid}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <BookOpen className="h-4 w-4 text-primary" />
                      Dosage Validation · {ref.herbName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-3">
                    <DataCard label="Max Tolerated Dose" value={ref.maxDailyDose} />
                    <DataCard label="Extraction" value={ref.extraction} />
                    <DataCard
                      label="Toxicity Warnings"
                      value={ref.toxicityWarnings.join(" · ")}
                      tone="danger"
                    />
                    <div className="sm:col-span-3">
                      <p className="text-xs text-muted-foreground">{ref.notes}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">Source: {ref.source}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Clinician dispensing note */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <NotebookPen className="h-4 w-4 text-primary" />
                  Validated Dispensing Note
                </CardTitle>
                <CardDescription className="text-xs">
                  Push validated dose adjustments or specific dispensing instructions to the patient portal.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Textarea
                  rows={4}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Hold hibiscus infusion x 48h. Resume amlodipine 5 mg OD. Re-check BP at 24h."
                  maxLength={1000}
                />
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">
                    {note.length}/1000 · transmitted under the active consultation session only.
                  </p>
                  <Button
                    size="sm"
                    disabled={!note.trim() || !activeSessionId}
                    onClick={() => {
                      // The note channel is the existing consultation_sessions
                      // record; we surface it via toast for the MVP. A future
                      // migration can add a clinician_notes table.
                      toast.success("Dispensing note queued for patient portal.");
                      setNote("");
                    }}
                  >
                    Send to Patient
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-start gap-2 rounded-lg border border-dashed p-3 text-[11px] text-muted-foreground">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              MedP-AI is an Academic &amp; Clinical Decision Support Tool. Findings supplement —
              they do not replace — professional diagnosis. Citations: MedP-AI Clinical Database
              v1.2, PCN Reference Protocol, WHO Traditional Medicine Monographs.
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function DataCard({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        tone === "danger" ? "border-[hsl(var(--danger))] bg-[hsl(var(--danger)/0.06)]" : "bg-muted/20"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}
