import { supabase } from "@/integrations/supabase/client";

export const FOUNDER_EMAIL = "chinedubisiola04@gmail.com";
export const FOUNDER_FALLBACK = {
  hospitalId: "MedP_HQ_001",
  hospitalName: "MedP-AI Demo Clinic",
  providerName: "Dr. Ayomide",
};

export interface ProviderStatus {
  isProvider: boolean;
  hospitalId: string | null;
  membershipStatus: "pending_verification" | "temporary" | "active" | "revoked" | null;
  hospitalName: string | null;
  tempExpiresAt: string | null;
  isFounder?: boolean;
}

/** Server-side authoritative check (RLS scoped to auth.uid()), with founder override. */
export async function fetchProviderStatus(): Promise<ProviderStatus> {
  const { data: userData } = await supabase.auth.getUser();
  const email = userData.user?.email?.toLowerCase() ?? null;
  const isFounder = email === FOUNDER_EMAIL;

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("role", "provider");
  let isProvider = !!roles?.length;

  const { data: membership } = await supabase
    .from("hospital_providers")
    .select("hospital_id,status,temp_expires_at,hospitals(name)")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const status = membership?.status ?? null;
  const verifiedActive =
    status === "active" ||
    (status === "temporary" &&
      (!membership?.temp_expires_at || new Date(membership.temp_expires_at) > new Date()));

  let hospitalId = verifiedActive ? membership?.hospital_id ?? null : null;
  let hospitalName = (membership as any)?.hospitals?.name ?? null;

  // Founder client-side override — unblocks access even if the server-side
  // seed trigger has not fired yet (e.g. email confirmed but trigger lag,
  // or no demo hospital row exists yet).
  if (isFounder) {
    isProvider = true;
    if (!hospitalId) hospitalId = FOUNDER_FALLBACK.hospitalId;
    if (!hospitalName) hospitalName = FOUNDER_FALLBACK.hospitalName;
  }

  return {
    isProvider,
    hospitalId,
    membershipStatus: status,
    hospitalName,
    tempExpiresAt: membership?.temp_expires_at ?? null,
    isFounder,
  };
}

/**
 * DEMO ONLY — grants the current signed-in user provider role + membership at
 * the "MedP-AI Demo Clinic" so they can access the Clinical Desk immediately.
 * Backed by a SECURITY DEFINER RPC that only affects auth.uid().
 */
export async function demoBypassVerification(): Promise<void> {
  const { error } = await supabase.rpc("demo_bypass_verification" as any);
  if (error) throw new Error(error.message || "Bypass failed");
}

