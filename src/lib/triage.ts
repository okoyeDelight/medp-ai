// ============================================================================
// MedP-AI Triage & O2O Handoff library — Live Queue + Two-Way Handshake
// - Patient enters the waiting room with anonymized age/gender/symptom class
// - Full interaction report is stored in the private `triage_reports` table
// - Verified doctors see a live anonymized queue (RLS filters columns)
// - Doctor "requests connection" -> optimistic atomic lock via request_triage()
// - Patient accept/decline -> accept_triage() / decline_triage()
// - Doctor concludes -> may issue a 72h follow-up ticket. Patient controls redemption.
// - Pharmacy handoff flow + dual PDF engine (unchanged)
// ============================================================================
import { supabase } from "@/integrations/supabase/client";
import type { InteractionReport } from "@/lib/telepharmacy";

// ---------- Types ----------
export type TriageStatus = "waiting" | "claimed" | "concluded" | "cancelled" | "expired";
export type HandoffStatus = "pending" | "accepted" | "declined" | "ready" | "dispensed" | "cancelled";

export interface TriageSession {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  hospital_id: string | null;
  triage_pin: string | null;
  pin_expires_at: string;
  claimed_at: string | null;
  concluded_at: string | null;
  cancelled_at: string | null;
  status: TriageStatus;
  age_band: string | null;
  gender: string | null;
  symptom_category: string | null;
  requested_by: string | null;
  requested_at: string | null;
  patient_accepted_at: string | null;
  provider_last_name: string | null;
  provider_license: string | null;
  created_at: string;
  updated_at: string;
}

export interface FollowupToken {
  id: string;
  triage_session_id: string | null;
  patient_id: string;
  doctor_id: string;
  doctor_last_name: string | null;
  doctor_license: string | null;
  token: string;
  expires_at: string;
  redeemed_at: string | null;
  redeemed_session_id: string | null;
  created_at: string;
}

export interface Prescription {
  items: Array<{ drug: string; dose: string; frequency: string; duration: string; notes?: string }>;
  clinical_note: string;
  disclaimer?: string;
}

export interface PharmacyHandoff {
  id: string;
  triage_session_id: string;
  patient_id: string;
  doctor_id: string;
  pharmacy_id: string;
  pharmacist_user_id: string;
  dispense_pin: string;
  prescription: Prescription | null;
  interaction_report: InteractionReport | null;
  status: HandoffStatus;
  accepted_at: string | null;
  ready_at: string | null;
  dispensed_at: string | null;
  created_at: string;
}

export interface DoctorPharmacistMessage {
  id: string;
  handoff_id: string;
  sender_id: string | null;
  sender_role: "doctor" | "pharmacist" | "system";
  body: string;
  created_at: string;
}

// ---------- PIN helpers ----------
function random4(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 10_000).padStart(4, "0");
}

// ---------- Symptom category (anonymized) ----------
export const SYMPTOM_CATEGORIES = [
  "General/Wellness",
  "Fever/Malaria-like",
  "Respiratory (cough/breathing)",
  "Cardiac (chest/palpitations)",
  "Gastro (stomach/vomit)",
  "Pain (headache/body)",
  "Skin/Rash",
  "Women's health",
  "Mental health",
  "Injury",
  "Chronic follow-up",
] as const;

export const AGE_BANDS = ["0-12", "13-17", "18-29", "30-44", "45-59", "60-74", "75+"] as const;
export const GENDERS = ["female", "male", "other", "prefer-not-to-say"] as const;

// ---------- Patient: waiting-room entry ----------
export async function enterWaitingRoom(opts: {
  ageBand: string; gender: string; symptomCategory: string; report: InteractionReport;
}): Promise<TriageSession> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("You must be signed in.");

  // Cancel any prior waiting sessions (one active at a time).
  await supabase
    .from("triage_sessions")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString(), triage_pin: null })
    .eq("patient_id", uid)
    .eq("status", "waiting");

  const pin = random4(); // still generated as an internal reference / backup path
  const { data, error } = await supabase
    .from("triage_sessions")
    .insert({
      patient_id: uid,
      triage_pin: pin,
      pin_expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
      age_band: opts.ageBand,
      gender: opts.gender,
      symptom_category: opts.symptomCategory,
    } as any)
    .select()
    .single();
  if (error) throw error;

  // Upload private report (only patient + accepted doctor can read).
  const session = data as unknown as TriageSession;
  const { error: repErr } = await supabase
    .from("triage_reports")
    .insert({
      triage_session_id: session.id,
      patient_id: uid,
      report: opts.report as any,
    } as any);
  if (repErr) throw repErr;
  return session;
}

export async function cancelTriageSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from("triage_sessions")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString(), triage_pin: null })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function getMyActiveTriage(): Promise<TriageSession | null> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return null;
  const { data } = await supabase
    .from("triage_sessions")
    .select("*")
    .eq("patient_id", uid)
    .in("status", ["waiting", "claimed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as unknown as TriageSession) ?? null;
}

// ---------- Doctor: live queue + handshake ----------
export async function fetchQueue(): Promise<TriageSession[]> {
  const { data } = await supabase
    .from("triage_sessions")
    .select("*")
    .eq("status", "waiting")
    .gt("pin_expires_at", new Date().toISOString())
    .order("created_at", { ascending: true });
  return (data as unknown as TriageSession[]) ?? [];
}

export async function requestTriage(sessionId: string): Promise<string> {
  const { data, error } = await supabase.rpc("request_triage" as any, { _session_id: sessionId });
  if (error) throw new Error(error.message || "Could not request patient");
  return data as unknown as string;
}

export async function acceptTriage(sessionId: string): Promise<string> {
  const { data, error } = await supabase.rpc("accept_triage" as any, { _session_id: sessionId });
  if (error) throw new Error(error.message || "Could not accept");
  return data as unknown as string;
}

export async function declineTriage(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc("decline_triage" as any, { _session_id: sessionId });
  if (error) throw error;
}

export async function fetchTriageById(id: string): Promise<TriageSession | null> {
  const { data } = await supabase.from("triage_sessions").select("*").eq("id", id).maybeSingle();
  return (data as unknown as TriageSession) ?? null;
}

export async function fetchDoctorActiveTriages(): Promise<TriageSession[]> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];
  const { data } = await supabase
    .from("triage_sessions")
    .select("*")
    .eq("doctor_id", uid)
    .in("status", ["claimed"])
    .order("claimed_at", { ascending: false });
  return (data as unknown as TriageSession[]) ?? [];
}

// Only readable once the patient has accepted (RLS-enforced).
export async function fetchTriageReport(sessionId: string): Promise<InteractionReport | null> {
  const { data } = await supabase
    .from("triage_reports")
    .select("report")
    .eq("triage_session_id", sessionId)
    .maybeSingle();
  return ((data as any)?.report as InteractionReport) ?? null;
}

// ---------- Doctor: conclude & follow-up tokens ----------
export async function concludeTriage(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from("triage_sessions")
    .update({ status: "concluded", concluded_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function issueFollowupToken(sessionId: string, hours = 72): Promise<string> {
  const { data, error } = await supabase.rpc("issue_followup_token" as any, {
    _session_id: sessionId,
    _hours: hours,
  });
  if (error) throw error;
  return data as unknown as string;
}

export async function fetchMyFollowupTokens(): Promise<FollowupToken[]> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];
  const { data } = await supabase
    .from("followup_tokens")
    .select("*")
    .eq("patient_id", uid)
    .is("redeemed_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  return (data as unknown as FollowupToken[]) ?? [];
}

export async function redeemFollowupToken(tokenId: string): Promise<string> {
  const { data, error } = await supabase.rpc("redeem_followup_token" as any, { _token_id: tokenId });
  if (error) throw error;
  return data as unknown as string;
}

// ---------- Handoff (pharmacy) ----------
export async function createPharmacyHandoff(opts: {
  triage: TriageSession;
  pharmacyId: string;
  pharmacistUserId: string;
  prescription: Prescription;
  interactionReport?: InteractionReport | null;
}): Promise<PharmacyHandoff> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Auth required.");
  const dispensePin = random4();
  const { data, error } = await supabase
    .from("pharmacy_handoffs")
    .insert({
      triage_session_id: opts.triage.id,
      patient_id: opts.triage.patient_id,
      doctor_id: uid,
      pharmacy_id: opts.pharmacyId,
      pharmacist_user_id: opts.pharmacistUserId,
      dispense_pin: dispensePin,
      prescription: opts.prescription as any,
      interaction_report: (opts.interactionReport ?? null) as any,
    } as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as PharmacyHandoff;
}

export async function fetchHandoffById(id: string): Promise<PharmacyHandoff | null> {
  const { data } = await supabase.from("pharmacy_handoffs").select("*").eq("id", id).maybeSingle();
  return (data as unknown as PharmacyHandoff) ?? null;
}

export async function fetchPatientActiveHandoff(): Promise<PharmacyHandoff | null> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return null;
  const { data } = await supabase
    .from("pharmacy_handoffs")
    .select("*")
    .eq("patient_id", uid)
    .in("status", ["pending", "accepted", "ready"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as unknown as PharmacyHandoff) ?? null;
}

export async function fetchPharmacistHandoffs(userId: string): Promise<PharmacyHandoff[]> {
  const { data } = await supabase
    .from("pharmacy_handoffs")
    .select("*")
    .eq("pharmacist_user_id", userId)
    .in("status", ["pending", "accepted", "ready"])
    .order("created_at", { ascending: false });
  return (data as unknown as PharmacyHandoff[]) ?? [];
}

export async function updateHandoffStatus(id: string, patch: Partial<PharmacyHandoff>) {
  const { error } = await supabase.from("pharmacy_handoffs").update(patch as any).eq("id", id);
  if (error) throw error;
}
export async function acceptHandoff(id: string) {
  await updateHandoffStatus(id, { status: "accepted", accepted_at: new Date().toISOString() });
}
export async function markHandoffReady(id: string) {
  await updateHandoffStatus(id, { status: "ready", ready_at: new Date().toISOString() });
}
export async function markHandoffDispensed(id: string) {
  await updateHandoffStatus(id, { status: "dispensed", dispensed_at: new Date().toISOString() });
}

// ---------- Chat ----------
export async function fetchHandoffMessages(handoffId: string): Promise<DoctorPharmacistMessage[]> {
  const { data } = await supabase
    .from("doctor_pharmacist_messages")
    .select("*")
    .eq("handoff_id", handoffId)
    .order("created_at", { ascending: true });
  return (data as unknown as DoctorPharmacistMessage[]) ?? [];
}

export async function sendHandoffMessage(opts: {
  handoffId: string;
  role: "doctor" | "pharmacist" | "system";
  body: string;
}) {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id ?? null;
  const { error } = await supabase.from("doctor_pharmacist_messages").insert({
    handoff_id: opts.handoffId,
    sender_id: uid,
    sender_role: opts.role,
    body: opts.body,
  } as any);
  if (error) throw error;
}

// ---------- Dual PDF engine ----------
import { jsPDF } from "jspdf";
import { safetyEmoji, safetyLabel } from "@/lib/telepharmacy";

const BRAND = "MedP-AI · Clinical Triage Record";
const FOOTER =
  "Academic & clinical decision support tool. Not a substitute for professional diagnosis.\nSupport: chinedubisiola04@gmail.com · +2349079543695";

function drawHeader(doc: jsPDF, title: string) {
  doc.setFillColor(15, 82, 186);
  doc.rect(0, 0, 210, 22, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("MedP-AI", 14, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(title, 210 - 14, 14, { align: "right" });
  doc.setTextColor(0);
}
function drawFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(90);
    doc.text(FOOTER, 14, 285, { maxWidth: 180 });
    doc.text(`Page ${i} / ${pageCount}`, 210 - 14, 285, { align: "right" });
    doc.setTextColor(0);
  }
}
function wrap(doc: jsPDF, text: string, x: number, y: number, maxWidth = 180, lineHeight = 5) {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

export function buildPatientPdf(handoff: PharmacyHandoff, pharmacyName: string, doctorName: string) {
  const doc = new jsPDF();
  drawHeader(doc, "Prescription & Dosage Guide");
  let y = 34;
  doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  doc.text("Your Prescription", 14, y); y += 10;
  doc.setFont("helvetica", "normal"); doc.setFontSize(11);
  y = wrap(doc, `Issued by: Dr. ${doctorName}`, 14, y);
  y = wrap(doc, `Pick up at: ${pharmacyName}`, 14, y);
  y = wrap(doc, `Date: ${new Date(handoff.created_at).toLocaleString()}`, 14, y); y += 4;
  doc.setDrawColor(15, 82, 186); doc.setLineWidth(0.7);
  doc.roundedRect(14, y, 182, 22, 3, 3);
  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("Secure Dispense PIN", 20, y + 8);
  doc.setFontSize(22); doc.setTextColor(15, 82, 186);
  doc.text(handoff.dispense_pin, 20, y + 18);
  doc.setTextColor(0); doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text("Show this PIN to the pharmacist to collect your medication.", 80, y + 14, { maxWidth: 115 });
  y += 32;
  doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.text("Medications", 14, y); y += 6;
  doc.setFont("helvetica", "normal"); doc.setFontSize(11);
  const items = handoff.prescription?.items ?? [];
  if (items.length === 0) {
    y = wrap(doc, "• (No medication items on record.)", 18, y);
  } else {
    for (const it of items) {
      y = wrap(doc, `• ${it.drug} — ${it.dose}, ${it.frequency}, for ${it.duration}${it.notes ? ` (${it.notes})` : ""}`, 18, y, 175);
      y += 2;
    }
  }
  y += 4;
  if (handoff.prescription?.clinical_note) {
    doc.setFont("helvetica", "bold"); doc.text("Doctor's note", 14, y); y += 6;
    doc.setFont("helvetica", "normal");
    y = wrap(doc, handoff.prescription.clinical_note, 14, y);
  }
  drawFooter(doc);
  return doc.output("blob");
}

export function buildClinicalPdf(opts: {
  handoff: PharmacyHandoff; pharmacyName: string; doctorName: string; patientName: string;
  transcript: DoctorPharmacistMessage[];
}) {
  const { handoff, pharmacyName, doctorName, patientName, transcript } = opts;
  const doc = new jsPDF();
  drawHeader(doc, "Clinical Triage Record");
  let y = 32;
  doc.setFont("helvetica", "bold"); doc.setFontSize(15);
  doc.text(BRAND, 14, y); y += 8;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  y = wrap(doc, `Handoff ID: ${handoff.id}`, 14, y);
  y = wrap(doc, `Patient: ${patientName}`, 14, y);
  y = wrap(doc, `Doctor: Dr. ${doctorName}`, 14, y);
  y = wrap(doc, `Pharmacy: ${pharmacyName}`, 14, y);
  y = wrap(doc, `Opened: ${new Date(handoff.created_at).toLocaleString()}`, 14, y);
  if (handoff.dispensed_at) y = wrap(doc, `Dispensed: ${new Date(handoff.dispensed_at).toLocaleString()}`, 14, y);
  y += 4;
  const rep = handoff.interaction_report;
  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("Interaction & Safety Flags", 14, y); y += 6;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  y = wrap(doc, `Safety Gate: ${safetyEmoji(rep?.safety_level ?? null)} ${safetyLabel(rep?.safety_level ?? null)}${rep?.safety_summary ? ` — ${rep.safety_summary}` : ""}`, 14, y);
  y = wrap(doc, `Vitals: HR ${rep?.vitals?.hr ?? "—"} bpm · BP ${rep?.vitals?.bp ?? "—"}`, 14, y);
  const herbs = rep?.herbal_intake?.length ? rep.herbal_intake.map((h) => `${h.name}${h.dose ? ` (${h.dose})` : ""}`).join(", ") : "(none logged)";
  y = wrap(doc, `Recent herbal intake: ${herbs}`, 14, y);
  y += 4;
  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("Prescription", 14, y); y += 6;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  for (const it of handoff.prescription?.items ?? []) {
    y = wrap(doc, `• ${it.drug} — ${it.dose}, ${it.frequency}, for ${it.duration}${it.notes ? ` [${it.notes}]` : ""}`, 18, y, 175);
  }
  if (handoff.prescription?.clinical_note) {
    y += 2; y = wrap(doc, `Clinical note: ${handoff.prescription.clinical_note}`, 14, y);
  }
  y += 4;
  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("Doctor ↔ Pharmacist Transcript", 14, y); y += 6;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  for (const m of transcript) {
    if (y > 265) { doc.addPage(); drawHeader(doc, "Clinical Triage Record (cont.)"); y = 32; }
    const stamp = new Date(m.created_at).toLocaleTimeString();
    const who = m.sender_role === "doctor" ? "Doctor" : m.sender_role === "pharmacist" ? "Pharmacist" : "System";
    y = wrap(doc, `[${stamp}] ${who}: ${m.body}`, 14, y, 180, 4.4);
    y += 1;
  }
  drawFooter(doc);
  return doc.output("blob");
}

export async function uploadAndRegisterPdf(opts: {
  handoffId: string; kind: "patient" | "clinical"; blob: Blob;
}): Promise<string> {
  const path = `${opts.handoffId}/${opts.handoffId}_${opts.kind}.pdf`;
  const { error: upErr } = await supabase.storage
    .from("triage-pdfs")
    .upload(path, opts.blob, { contentType: "application/pdf", upsert: true });
  if (upErr) throw upErr;
  const { error: insErr } = await supabase.from("triage_documents").insert({
    handoff_id: opts.handoffId,
    kind: opts.kind,
    storage_path: path,
    file_name: `${opts.kind === "patient" ? "Prescription" : "Clinical-Triage-Record"}.pdf`,
  } as any);
  if (insErr) throw insErr;
  return path;
}

export async function downloadTriagePdf(storagePath: string, fileName: string) {
  const { data, error } = await supabase.storage.from("triage-pdfs").download(storagePath);
  if (error) throw error;
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function fetchHandoffDocuments(handoffId: string) {
  const { data } = await supabase
    .from("triage_documents").select("*").eq("handoff_id", handoffId);
  return (data ?? []) as Array<{ id: string; kind: "patient" | "clinical"; storage_path: string; file_name: string }>;
}
