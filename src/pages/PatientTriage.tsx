// Patient side — Live Waiting Room + Doctor Request Modal + Follow-up Tickets
import { useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { LegalFooter } from "@/components/LegalFooter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Stethoscope, Loader2, ShieldCheck, MapPin, Pill, X, PhoneCall, Download, Clock, TicketCheck,
} from "lucide-react";
import { ConsultationChat } from "@/components/ConsultationChat";
import { supabase } from "@/integrations/supabase/client";
import {
  enterWaitingRoom, getMyActiveTriage, cancelTriageSession,
  fetchPatientActiveHandoff, fetchHandoffDocuments, downloadTriagePdf,
  acceptTriage, declineTriage,
  fetchMyFollowupTokens, redeemFollowupToken,
  SYMPTOM_CATEGORIES, AGE_BANDS, GENDERS,
  type TriageSession, type PharmacyHandoff, type FollowupToken,
} from "@/lib/triage";
import { buildInteractionReport } from "@/lib/telepharmacy";
import { fetchHealthProfile } from "@/lib/healthProfile";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";

export default function PatientTriage() {
  const nav = useNavigate();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [triage, setTriage] = useState<TriageSession | null>(null);
  const [handoff, setHandoff] = useState<PharmacyHandoff | null>(null);
  const [tokens, setTokens] = useState<FollowupToken[]>([]);
  const [pharmacyName, setPharmacyName] = useState("");
  const [pharmacistName, setPharmacistName] = useState("");
  const [creating, setCreating] = useState(false);
  const patientIdRef = useRef<string | null>(null);

  // Intake form
  const [ageBand, setAgeBand] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [symptom, setSymptom] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const tr = await getMyActiveTriage();
    setTriage(tr);
    const h = await fetchPatientActiveHandoff();
    setHandoff(h);
    setTokens(await fetchMyFollowupTokens());
    if (h) await hydrateHandoff(h);
    setLoading(false);
  };

  async function hydrateHandoff(h: PharmacyHandoff) {
    const { data: pharm } = await supabase
      .from("pharmacies" as any).select("name,owner_user_id").eq("id", h.pharmacy_id).maybeSingle();
    setPharmacyName((pharm as any)?.name ?? "Selected pharmacy");
    if ((pharm as any)?.owner_user_id) {
      const { data: prof } = await supabase
        .from("profiles").select("display_name").eq("user_id", (pharm as any).owner_user_id).maybeSingle();
      setPharmacistName((prof as any)?.display_name ?? "your pharmacist");
    }
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      patientIdRef.current = data.user?.id ?? null;
      await load();
    })();
  }, []);

  useEffect(() => {
    const uid = patientIdRef.current;
    if (!uid) return;
    const ch = supabase
      .channel("patient-triage-" + uid)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "triage_sessions", filter: `patient_id=eq.${uid}` },
        () => load())
      .on("postgres_changes",
        { event: "*", schema: "public", table: "pharmacy_handoffs", filter: `patient_id=eq.${uid}` },
        () => load())
      .on("postgres_changes",
        { event: "*", schema: "public", table: "followup_tokens", filter: `patient_id=eq.${uid}` },
        () => fetchMyFollowupTokens().then(setTokens))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [patientIdRef.current]);

  async function handleStart() {
    if (!ageBand || !gender || !symptom) { toast.error("Please fill in age, gender and what's bothering you."); return; }
    if (!patientIdRef.current) { toast.error("Please sign in first."); return; }
    setCreating(true);
    try {
      const profile = await fetchHealthProfile();
      const displayName = profile?.display_name || "Patient";
      const report = await buildInteractionReport(patientIdRef.current, displayName);
      const s = await enterWaitingRoom({ ageBand, gender, symptomCategory: symptom, report });
      setTriage(s);
      toast.success("You're in the waiting room. Doctors can now request a consult.");
    } catch (e: any) {
      toast.error(e.message ?? "Could not enter waiting room.");
    } finally { setCreating(false); }
  }

  async function handleCancel() {
    if (!triage) return;
    await cancelTriageSession(triage.id);
    setTriage(null);
    toast("Triage cancelled.");
  }

  async function handleAccept() {
    if (!triage) return;
    try {
      await acceptTriage(triage.id);
      toast.success("Consultation opened with your doctor.");
    } catch (e: any) { toast.error(e.message ?? "Could not accept."); }
  }
  async function handleDecline() {
    if (!triage) return;
    try {
      await declineTriage(triage.id);
      toast("Doctor request declined. Others may still request.");
    } catch (e: any) { toast.error(e.message ?? "Could not decline."); }
  }
  async function handleRedeem(tok: FollowupToken) {
    try {
      await redeemFollowupToken(tok.id);
      toast.success("Follow-up consultation opened.");
    } catch (e: any) { toast.error(e.message ?? "Ticket invalid."); }
  }

  // Doctor request modal: waiting session that has requested_by but not yet accepted
  const showRequestModal = !!triage
    && triage.status === "waiting"
    && !!triage.requested_by
    && !triage.patient_accepted_at;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary/5 pb-24">
      <AppHeader />
      <div className="container max-w-2xl space-y-4 px-4 py-6">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2 text-primary"><Stethoscope className="h-5 w-5" /></div>
          <div>
            <h1 className="text-xl font-semibold">{t("triage.title")}</h1>
            <p className="text-xs text-muted-foreground">{t("triage.subtitle")}</p>
          </div>
        </div>

        {/* Follow-up ticket list — always visible when there are tickets */}
        {tokens.length > 0 && (
          <Card className="border-emerald-500/40">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TicketCheck className="h-4 w-4 text-emerald-600" /> {t("followup.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tokens.map((tok) => (
                <div key={tok.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="text-sm">
                    <div className="font-medium">Dr. {tok.doctor_last_name ?? "Doctor"} · MDCN #{tok.doctor_license}</div>
                    <div className="text-xs text-muted-foreground">
                      <Clock className="mr-1 inline h-3 w-3" />
                      {t("followup.expires")}: {new Date(tok.expires_at).toLocaleString()}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => handleRedeem(tok)}>{t("followup.redeem")}</Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {loading ? (
          <Card><CardContent className="flex items-center gap-2 p-8"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</CardContent></Card>
        ) : handoff ? (
          <HandoffView handoff={handoff} pharmacyName={pharmacyName} pharmacistName={pharmacistName} />
        ) : triage && triage.status === "waiting" ? (
          <Card className="overflow-hidden border-primary/30">
            <div className="bg-gradient-to-r from-primary to-primary/70 p-6 text-primary-foreground">
              <div className="text-xs uppercase tracking-widest opacity-80">{t("triage.waiting")}</div>
              <div className="mt-1 flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-lg font-semibold">You're in the queue</span>
              </div>
              <div className="mt-2 text-sm opacity-90">{t("triage.waiting.desc")}</div>
            </div>
            <CardContent className="space-y-3 p-5">
              <div className="grid gap-2 text-sm sm:grid-cols-3">
                <div className="rounded-md bg-muted p-2 text-center">Age band: <b>{triage.age_band}</b></div>
                <div className="rounded-md bg-muted p-2 text-center">Gender: <b>{triage.gender}</b></div>
                <div className="rounded-md bg-muted p-2 text-center">Category: <b>{triage.symptom_category}</b></div>
              </div>
              <Alert className="border-primary/20 bg-primary/5">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <AlertTitle className="text-sm">Anonymized & consent-first</AlertTitle>
                <AlertDescription className="text-xs">
                  A doctor must request to see you. Only when you tap Accept does your medical record unlock — for that doctor only.
                </AlertDescription>
              </Alert>
              <Button variant="outline" className="w-full" onClick={handleCancel}>
                <X className="mr-2 h-4 w-4" /> {t("triage.cancel")}
              </Button>
            </CardContent>
          </Card>
        ) : triage && triage.status === "claimed" ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" /> Consultation open with Dr. {triage.provider_last_name ?? "Doctor"}
                </CardTitle>
                <CardDescription>
                  Your doctor is reviewing your case. Chat with them below — a prescription will appear once ready.
                </CardDescription>
              </CardHeader>
            </Card>
            <ConsultationChat
              sessionId={triage.id}
              role="patient"
              meLabel="You"
              themLabel={`Dr. ${triage.provider_last_name ?? "Doctor"}`}
              heightClass="h-80"
            />
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{t("triage.start")}</CardTitle>
              <CardDescription>
                Enter a brief, anonymized intake. Doctors in the queue will only see age band, gender, and general category.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t("triage.intake.age")}</Label>
                  <Select value={ageBand} onValueChange={setAgeBand}>
                    <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                    <SelectContent>{AGE_BANDS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("triage.intake.gender")}</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                    <SelectContent>{GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("triage.intake.symptom")}</Label>
                <Select value={symptom} onValueChange={setSymptom}>
                  <SelectTrigger><SelectValue placeholder="Choose category" /></SelectTrigger>
                  <SelectContent>{SYMPTOM_CATEGORIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">{t("triage.intake.symptom.hint")}</p>
              </div>
              <Button onClick={handleStart} disabled={creating} className="w-full">
                {creating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entering…</> : <><Stethoscope className="mr-2 h-4 w-4" /> {t("triage.start")}</>}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Doctor Request Modal */}
      <Dialog open={showRequestModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" /> {t("triage.request.title")}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {t("triage.request.body", {
                name: triage?.provider_last_name ?? "—",
                license: triage?.provider_license ?? "—",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={handleDecline}>{t("triage.decline")}</Button>
            <Button onClick={handleAccept} className="bg-primary">{t("triage.accept")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LegalFooter />
    </div>
  );
}

function HandoffView({ handoff, pharmacyName, pharmacistName }: {
  handoff: PharmacyHandoff; pharmacyName: string; pharmacistName: string;
}) {
  const [docs, setDocs] = useState<Awaited<ReturnType<typeof fetchHandoffDocuments>>>([]);
  useEffect(() => { fetchHandoffDocuments(handoff.id).then(setDocs); }, [handoff.id, handoff.status]);
  const isReady = handoff.status === "ready" || handoff.status === "dispensed";
  const patientPdf = docs.find((d) => d.kind === "patient");
  return (
    <div className="space-y-4">
      {!isReady ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" /> Coordinating with {pharmacyName}
            </CardTitle>
            <CardDescription>Your doctor is chatting with the pharmacist to finalise your prescription.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card className="overflow-hidden border-primary/30">
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 p-6 text-white">
            <div className="text-xs uppercase tracking-widest opacity-90">Prescription Ready</div>
            <div className="mt-1 text-xs opacity-80">Secure Dispense PIN</div>
            <div className="font-mono text-5xl font-bold tracking-[0.4em]">{handoff.dispense_pin}</div>
            <div className="mt-2 text-sm opacity-90">Show this PIN at the pharmacy to collect your medication.</div>
          </div>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">{pharmacyName}</div>
                <div className="text-sm text-muted-foreground">Pharmacist: {pharmacistName}</div>
              </div>
            </div>
            {patientPdf && (
              <Button variant="outline" className="w-full"
                onClick={() => downloadTriagePdf(patientPdf.storage_path, patientPdf.file_name)}>
                <Download className="mr-2 h-4 w-4" /> Download prescription (PDF)
              </Button>
            )}
            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              Need help? <a href="tel:+2349079543695" className="font-medium text-primary"><PhoneCall className="mr-1 inline h-3 w-3" />+234 907 954 3695</a>
            </div>
          </CardContent>
        </Card>
      )}
      {handoff.prescription && (
        <Card>
          <CardHeader><CardTitle className="text-base">Your prescription</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {handoff.prescription.items.map((it, i) => (
              <div key={i} className="rounded-md border p-3">
                <div className="font-medium">{it.drug}</div>
                <div className="text-sm text-muted-foreground">{it.dose} · {it.frequency} · {it.duration}</div>
                {it.notes && <div className="mt-1 text-xs text-muted-foreground">Note: {it.notes}</div>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
