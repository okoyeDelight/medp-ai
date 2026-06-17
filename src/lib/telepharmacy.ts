import { supabase } from "@/integrations/supabase/client";

export interface Pharmacy {
  id: string;
  owner_user_id: string;
  name: string;
  license_number: string;
  is_licensed_pharmacy: boolean;
  duty_status: "online" | "offline";
  lat: number | null;
  lng: number | null;
  address: string | null;
  phone: string | null;
  service_radius_km: number;
  hours_open: string | null;
  hours_close: string | null;
  auto_duty: boolean;
  pricing_mode: "free" | "paid";
  price_naira: number;
  quick_replies: string[];
}

/** Returns true if current local time falls inside [open, close). Supports overnight ranges. */
export function isWithinDutyHours(p: Pick<Pharmacy, "hours_open" | "hours_close">): boolean {
  if (!p.hours_open || !p.hours_close) return true;
  const now = new Date();
  const [oh, om] = p.hours_open.split(":").map(Number);
  const [ch, cm] = p.hours_close.split(":").map(Number);
  const cur = now.getHours() * 60 + now.getMinutes();
  const open = oh * 60 + (om || 0);
  const close = ch * 60 + (cm || 0);
  return open <= close ? cur >= open && cur < close : cur >= open || cur < close;
}

export async function fetchSessionHistory(pharmacistUserId: string): Promise<PharmacyChatSession[]> {
  const { data } = await supabase
    .from("pharmacy_chat_sessions" as any)
    .select("*")
    .eq("pharmacist_user_id", pharmacistUserId)
    .in("status", ["ended", "declined"])
    .order("ended_at", { ascending: false })
    .limit(100);
  return (data as unknown as PharmacyChatSession[]) ?? [];
}

export interface PharmacyChatSession {
  id: string;
  patient_id: string;
  pharmacy_id: string;
  pharmacist_user_id: string;
  status: "pending" | "active" | "ended" | "declined";
  interaction_report: InteractionReport | null;
  started_at: string;
  accepted_at: string | null;
  ended_at: string | null;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  sender_id: string | null;
  sender_role: "patient" | "pharmacist" | "system";
  body: string;
  created_at: string;
}

export interface InteractionReport {
  patient_label: string;
  herbal_intake: { name: string; lastTaken?: string; dose?: string }[];
  symptoms: string[];
  vitals: { hr?: number; bp?: string; measured_at?: string };
  safety_level: "red" | "yellow" | "green" | null;
  safety_summary?: string;
  generated_at: string;
}

/** Haversine distance in km. */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Browser geolocation with a Lagos fallback. */
export function getUserLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve) => {
    const fallback = { lat: 6.5244, lng: 3.3792 }; // Lagos
    if (!navigator.geolocation) return resolve(fallback);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(fallback),
      { timeout: 4000 },
    );
  });
}

export async function fetchOnlinePharmacies(): Promise<Pharmacy[]> {
  const { data, error } = await supabase
    .from("pharmacies" as any)
    .select("*")
    .eq("is_licensed_pharmacy", true)
    .eq("duty_status", "online");
  if (error) {
    console.error("[telepharmacy] fetch failed", error);
    return [];
  }
  return (data as unknown as Pharmacy[]) ?? [];
}

export async function fetchMyPharmacy(userId: string): Promise<Pharmacy | null> {
  const { data } = await supabase
    .from("pharmacies" as any)
    .select("*")
    .eq("owner_user_id", userId)
    .maybeSingle();
  return (data as unknown as Pharmacy) ?? null;
}

export async function upsertMyPharmacy(p: Partial<Pharmacy> & { owner_user_id: string; name: string; license_number: string }) {
  const { data, error } = await supabase
    .from("pharmacies" as any)
    .upsert(p, { onConflict: "owner_user_id" })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Pharmacy;
}

export async function setDutyStatus(pharmacyId: string, status: "online" | "offline") {
  const { error } = await supabase
    .from("pharmacies" as any)
    .update({ duty_status: status })
    .eq("id", pharmacyId);
  if (error) throw error;
}

/** Build a clinical interaction summary for the patient from local diary/vitals. */
export async function buildInteractionReport(patientId: string, displayName: string): Promise<InteractionReport> {
  // Latest vitals
  const { data: v } = await supabase
    .from("vitals_logs")
    .select("pulse_bpm,systolic,diastolic,measured_at")
    .eq("user_id", patientId)
    .order("measured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Recent herbal intake (last 5 doses)
  const { data: doses } = await supabase
    .from("dose_logs")
    .select("remedy_id,dose,taken_at")
    .eq("user_id", patientId)
    .order("taken_at", { ascending: false })
    .limit(5);

  // Derive Safety Gate result from latest health_safety_scores (best-effort).
  let safety_level: InteractionReport["safety_level"] = null;
  let safety_summary: string | undefined;
  try {
    const { data: score } = await supabase
      .from("health_safety_scores" as any)
      .select("*")
      .eq("user_id", patientId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (score) {
      const s: any = score;
      const band = (s.band ?? s.level ?? "").toString().toLowerCase();
      if (band === "red" || band === "yellow" || band === "green") {
        safety_level = band as "red" | "yellow" | "green";
      } else if (typeof s.score === "number") {
        safety_level = s.score >= 80 ? "green" : s.score >= 50 ? "yellow" : "red";
      }
      safety_summary = s.summary ?? s.note ?? undefined;
    }
  } catch {
    /* table/columns may differ — fail silent */
  }

  return {
    patient_label: displayName || "Patient",
    herbal_intake: (doses ?? []).map((d: any) => ({
      name: d.remedy_id,
      dose: d.dose ?? undefined,
      lastTaken: d.taken_at,
    })),
    symptoms: [],
    vitals: v
      ? {
          hr: (v as any).pulse_bpm ?? undefined,
          bp: (v as any).systolic && (v as any).diastolic ? `${(v as any).systolic}/${(v as any).diastolic}` : undefined,
          measured_at: (v as any).measured_at,
        }
      : {},
    safety_level,
    safety_summary,
    generated_at: new Date().toISOString(),
  };
}

export function formatReportAsMessage(r: InteractionReport): string {
  const lines = [
    "📋 MEDP-AI CLINICAL CONTEXT",
    `Patient: ${r.patient_label}`,
    "",
    "Recent herbal intake:",
    r.herbal_intake.length === 0
      ? "  • (none logged)"
      : r.herbal_intake.map((h) => `  • ${h.name}${h.dose ? ` — ${h.dose}` : ""}`).join("\n"),
    "",
    "Latest vitals:",
    `  • HR: ${r.vitals.hr ?? "—"} bpm`,
    `  • BP: ${r.vitals.bp ?? "—"}`,
    "",
    "(Auto-injected by MedP-AI for clinical context. End-to-end private to this consultation.)",
  ];
  return lines.join("\n");
}

export async function initiateChatSession(opts: {
  patientId: string;
  pharmacy: Pharmacy;
  report: InteractionReport;
}): Promise<PharmacyChatSession> {
  const { data, error } = await supabase
    .from("pharmacy_chat_sessions" as any)
    .insert({
      patient_id: opts.patientId,
      pharmacy_id: opts.pharmacy.id,
      pharmacist_user_id: opts.pharmacy.owner_user_id,
      status: "pending",
      interaction_report: opts.report,
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as PharmacyChatSession;
}

export async function acceptChatSession(sessionId: string) {
  const { error } = await supabase
    .from("pharmacy_chat_sessions" as any)
    .update({ status: "active", accepted_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function endChatSession(sessionId: string, transcript: ChatMessage[]) {
  const { error } = await supabase
    .from("pharmacy_chat_sessions" as any)
    .update({
      status: "ended",
      ended_at: new Date().toISOString(),
      archived_transcript: transcript,
    })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function declineChatSession(sessionId: string) {
  const { error } = await supabase
    .from("pharmacy_chat_sessions" as any)
    .update({ status: "declined", ended_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function sendMessage(opts: {
  sessionId: string;
  senderId: string;
  role: "patient" | "pharmacist";
  body: string;
}) {
  const { error } = await supabase
    .from("pharmacy_chat_messages" as any)
    .insert({
      session_id: opts.sessionId,
      sender_id: opts.senderId,
      sender_role: opts.role,
      body: opts.body,
    });
  if (error) throw error;
}

export async function fetchMessages(sessionId: string): Promise<ChatMessage[]> {
  const { data } = await supabase
    .from("pharmacy_chat_messages" as any)
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  return (data as unknown as ChatMessage[]) ?? [];
}
