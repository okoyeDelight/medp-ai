// Consultation session client shim. PIN generation happens server-side in
// the `consultation-pin` Edge Function (JWT-verified). Heartbeat + terminate
// also proxy through the edge function so RLS + validation are enforced.

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

export const HEARTBEAT_INTERVAL_MS = 30_000;
export const HEARTBEAT_STALE_MS = 120_000;

async function callEdge<T>(body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke("consultation-pin", { body });
  if (error) throw new Error(error.message ?? "Consultation service unavailable.");
  if ((data as any)?.error) throw new Error(String((data as any).error));
  return data as T;
}

export async function startConsultationSession(): Promise<ConsultationSession> {
  return callEdge<ConsultationSession>({ action: "start" });
}

export async function heartbeat(sessionId: string): Promise<void> {
  await callEdge({ action: "heartbeat", session_id: sessionId });
}

export async function terminateSession(sessionId: string): Promise<void> {
  await callEdge({ action: "terminate", session_id: sessionId });
}

export async function terminateIfStale(
  sessionId: string,
): Promise<{ status: string; terminated: boolean } | null> {
  try {
    return await callEdge<{ status: string; terminated: boolean } | null>({
      action: "terminate_if_stale", session_id: sessionId,
    });
  } catch {
    return null;
  }
}
