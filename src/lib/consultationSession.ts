import { supabase } from "@/integrations/supabase/client";

export interface ConsultationSession {
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

const PIN_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
export const HEARTBEAT_INTERVAL_MS = 30_000;
export const HEARTBEAT_STALE_MS = 120_000;

function rand4(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/** Pick the patient's default hospital (first one for now). */
async function defaultHospitalId(): Promise<string> {
  const { data, error } = await supabase
    .from("hospitals")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error || !data) throw new Error("No hospital available to start a stream.");
  return data.id;
}

/** Start a fresh session with a random 4-digit PIN (2h TTL). */
export async function startConsultationSession(): Promise<ConsultationSession> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const hospitalId = await defaultHospitalId();
  const now = new Date();
  const pinExpires = new Date(now.getTime() + PIN_TTL_MS);
  const { data, error } = await supabase
    .from("consultation_sessions")
    .insert({
      patient_id: u.user.id,
      hospital_id: hospitalId,
      pin: rand4(),
      pin_expires_at: pinExpires.toISOString(),
      ends_at: pinExpires.toISOString(),
      last_heartbeat: now.toISOString(),
      status: "active",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as ConsultationSession;
}

export async function heartbeat(sessionId: string): Promise<void> {
  await supabase.rpc("patient_heartbeat", { _session_id: sessionId });
}

export async function terminateSession(sessionId: string): Promise<void> {
  await supabase
    .from("consultation_sessions")
    .update({ status: "terminated", pin: null, revoked_at: new Date().toISOString() })
    .eq("id", sessionId);
}

export async function terminateIfStale(sessionId: string): Promise<{ status: string; terminated: boolean } | null> {
  const { data, error } = await supabase.rpc("terminate_if_stale", { _session_id: sessionId });
  if (error || !data) return null;
  const row = Array.isArray(data) ? data[0] : data;
  return row as { status: string; terminated: boolean };
}
