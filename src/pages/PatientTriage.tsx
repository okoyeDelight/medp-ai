// Patient side: "See a Doctor" → generates Triage PIN, waits for doctor to claim,
// then shows the O2O handoff status (pharmacy selected, Dispense PIN, PDF).
import { useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { LegalFooter } from "@/components/LegalFooter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Stethoscope, Loader2, ShieldCheck, KeyRound, Copy, Check, Clock, MapPin, Pill, X, PhoneCall, Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  createTriageSession, getMyActiveTriage, cancelTriageSession,
  fetchPatientActiveHandoff, fetchHandoffDocuments, downloadTriagePdf,
  type TriageSession, type PharmacyHandoff,
} from "@/lib/triage";
import { buildInteractionReport } from "@/lib/telepharmacy";
import { fetchHealthProfile } from "@/lib/healthProfile";
import { toast } from "sonner";

function useCountdown(iso: string | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!iso) return { mm: "--", ss: "--", expired: true, remaining: 0 };
  const remaining = Math.max(0, new Date(iso).getTime() - now);
  const mm = String(Math.floor(remaining / 60_000)).padStart(2, "0");
  const ss = String(Math.floor((remaining % 60_000) / 1000)).padStart(2, "0");
  return { mm, ss, expired: remaining <= 0, remaining };
}

export default function PatientTriage() {
  const [loading, setLoading] = useState(true);
  const [triage, setTriage] = useState<TriageSession | null>(null);
  const [handoff, setHandoff] = useState<PharmacyHandoff | null>(null);
  const [pharmacyName, setPharmacyName] = useState<string>("");
  const [pharmacistName, setPharmacistName] = useState<string>("");
  const [pinCopied, setPinCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const patientIdRef = useRef<string | null>(null);

  const countdown = useCountdown(triage?.pin_expires_at ?? null);

  const load = async () => {
    setLoading(true);
    const t = await getMyActiveTriage();
    setTriage(t);
    const h = await fetchPatientActiveHandoff();
    setHandoff(h);
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

  // Realtime: track my triage + handoff transitions
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
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [patientIdRef.current]);

  // Auto-expire waiting PIN visually
  useEffect(() => {
    if (triage?.status === "waiting" && countdown.expired) load();
  }, [countdown.expired, triage?.status]);

  async function handleStart() {
    if (!patientIdRef.current) { toast.error("Please sign in first."); return; }
    setCreating(true);
    try {
      const profile = await fetchHealthProfile();
      const displayName = profile?.display_name || "Patient";
      const report = await buildInteractionReport(patientIdRef.current, displayName);
      const s = await createTriageSession(report);
      setTriage(s);
      toast.success("Triage PIN generated. Share with your doctor.");
    } catch (e: any) {
      toast.error(e.message ?? "Could not start triage.");
    } finally {
      setCreating(false);
    }
  }

  async function handleCancel() {
    if (!triage) return;
    await cancelTriageSession(triage.id);
    setTriage(null);
    toast("Triage cancelled.");
  }

  function copyPin() {
    if (!triage?.triage_pin) return;
    navigator.clipboard.writeText(triage.triage_pin);
    setPinCopied(true);
    setTimeout(() => setPinCopied(false), 1500);
  }

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary/5 pb-24">
      <AppHeader />
      <div className="container max-w-2xl space-y-4 px-4 py-6">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2 text-primary"><Stethoscope className="h-5 w-5" /></div>
          <div>
            <h1 className="text-xl font-semibold">See a Doctor</h1>
            <p className="text-xs text-muted-foreground">Secure clinical triage · end-to-end private</p>
          </div>
        </div>

        {loading ? (
          <Card><CardContent className="flex items-center gap-2 p-8"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</CardContent></Card>
        ) : handoff ? (
          <HandoffView
            handoff={handoff}
            pharmacyName={pharmacyName}
            pharmacistName={pharmacistName}
          />
        ) : triage && triage.status === "waiting" && !countdown.expired ? (
          <Card className="overflow-hidden border-primary/30">
            <div className="bg-gradient-to-r from-primary to-primary/70 p-6 text-primary-foreground">
              <div className="text-xs uppercase tracking-widest opacity-80">Your Triage PIN</div>
              <div className="mt-1 flex items-center gap-3">
                <div className="font-mono text-5xl font-bold tracking-[0.4em]">{triage.triage_pin}</div>
                <button
                  onClick={copyPin}
                  className="ml-auto rounded-full bg-white/15 p-2 transition hover:bg-white/25"
                  aria-label="Copy PIN"
                >
                  {pinCopied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                Expires in {countdown.mm}:{countdown.ss}
              </div>
            </div>
            <CardContent className="space-y-3 p-5">
              <p className="text-sm">
                Share this 4-digit PIN with your doctor. Once they enter it into their Clinical Desk,
                your recent vitals and herbal history will be sent for review.
              </p>
              <Alert className="border-primary/20 bg-primary/5">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <AlertTitle className="text-sm">Encrypted &amp; revocable</AlertTitle>
                <AlertDescription className="text-xs">
                  Only the doctor who receives this PIN can view your data. You can cancel any time.
                </AlertDescription>
              </Alert>
              <Button variant="outline" className="w-full" onClick={handleCancel}>
                <X className="mr-2 h-4 w-4" /> Cancel triage
              </Button>
            </CardContent>
          </Card>
        ) : triage && triage.status === "claimed" ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" /> Doctor is reviewing your case
              </CardTitle>
              <CardDescription>
                Your doctor is currently coordinating with a nearby pharmacy. Please keep this screen open —
                we'll notify you as soon as your prescription is ready.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div className="text-sm">Locating the closest on-duty pharmacy…</div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Start a secure triage</CardTitle>
              <CardDescription>
                We'll generate a 4-digit Triage PIN that expires in 10 minutes. Give it to your doctor
                to connect and share your latest clinical context.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><KeyRound className="mt-0.5 h-4 w-4 text-primary" /> Doctor enters PIN to unlock your case.</li>
                <li className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 text-primary" /> Only your recent vitals, herbs and safety score are shared.</li>
                <li className="flex items-start gap-2"><Pill className="mt-0.5 h-4 w-4 text-primary" /> If a prescription is issued, you receive a Dispense PIN + pickup map.</li>
              </ul>
              <Button onClick={handleStart} disabled={creating} className="w-full">
                {creating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparing…</> : <><Stethoscope className="mr-2 h-4 w-4" /> Generate Triage PIN</>}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      <LegalFooter />
    </div>
  );
}

function HandoffView({ handoff, pharmacyName, pharmacistName }: {
  handoff: PharmacyHandoff; pharmacyName: string; pharmacistName: string;
}) {
  const [docs, setDocs] = useState<Awaited<ReturnType<typeof fetchHandoffDocuments>>>([]);

  useEffect(() => {
    fetchHandoffDocuments(handoff.id).then(setDocs);
  }, [handoff.id, handoff.status]);

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
            <CardDescription>
              Your doctor is chatting with the pharmacist to finalise your prescription.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden border-primary/30">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 p-6 text-white">
              <div className="text-xs uppercase tracking-widest opacity-90">Prescription Ready</div>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="text-xs opacity-80">Secure Dispense PIN</span>
              </div>
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

              <div className="overflow-hidden rounded-lg border">
                <iframe
                  title="Pharmacy location"
                  className="h-56 w-full"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=3.35,6.50,3.42,6.55&layer=mapnik&marker=6.5244,3.3792`}
                />
              </div>

              {patientPdf && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => downloadTriagePdf(patientPdf.storage_path, patientPdf.file_name)}
                >
                  <Download className="mr-2 h-4 w-4" /> Download prescription (PDF)
                </Button>
              )}

              <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                Need help? Call support: <a href="tel:+2349079543695" className="font-medium text-primary"><PhoneCall className="mr-1 inline h-3 w-3" />+234 907 954 3695</a>
              </div>
            </CardContent>
          </Card>
        </>
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
            {handoff.prescription.clinical_note && (
              <div className="rounded-md bg-primary/5 p-3 text-sm">
                <div className="mb-1 text-xs font-semibold uppercase text-primary">Doctor's note</div>
                {handoff.prescription.clinical_note}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
