import { supabase } from "@/integrations/supabase/client";

export interface ProviderStatus {
  isProvider: boolean;
  hospitalId: string | null;
  membershipStatus: "pending_verification" | "temporary" | "active" | "revoked" | null;
  hospitalName: string | null;
  tempExpiresAt: string | null;
  /** Server-verified owner/developer preview access (audit-flagged, NOT a real provider credential). */
  isOwnerPreview?: boolean;
}

/**
 * Server-side owner/developer preview check.
 * The allowlist lives in a private table the client cannot read; this RPC is the
 * only surface, so authorization is never decided in the browser.
 */
export async function isOwnerPreview(): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_owner_preview" as any, {} as any);
  if (error) return false;
  return data === true;
}

/**
 * Provisions owner preview access (provider membership at the demo clinic) and
 * writes an audit row distinguishing it from real, hospital-verified access.
 * Rejects server-side for anyone not on the allowlist.
 */
export async function startOwnerPreview(): Promise<{ hospitalId: string; hospitalName: string } | null> {
  const { data, error } = await supabase.rpc("start_owner_preview" as any, {} as any);
  if (error) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return { hospitalId: (row as any).hospital_id, hospitalName: (row as any).hospital_name };
}

/** Server-side authoritative check (RLS scoped to auth.uid()). */
export async function fetchProviderStatus(): Promise<ProviderStatus> {
  const ownerPreview = await isOwnerPreview();

  const readMembership = async () => {
    const { data } = await supabase
      .from("hospital_providers")
      .select("hospital_id,status,temp_expires_at,hospitals(name)")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  };

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("role", "provider");
  let isProvider = !!roles?.length;

  let membership = await readMembership();

  const verified = (m: typeof membership) => {
    const s = m?.status ?? null;
    return (
      s === "active" ||
      (s === "temporary" && (!m?.temp_expires_at || new Date(m.temp_expires_at) > new Date()))
    );
  };

  // Owner preview: ask the backend to provision the scoped membership once.
  // This grants entry to the clinical workspace only — patient-data RLS is untouched.
  if (ownerPreview && !verified(membership)) {
    const provisioned = await startOwnerPreview();
    if (provisioned) {
      isProvider = true;
      membership = await readMembership();
    }
  }

  const status = membership?.status ?? null;
  const hospitalId = verified(membership) ? membership?.hospital_id ?? null : null;
  const hospitalName = (membership as any)?.hospitals?.name ?? null;

  return {
    isProvider: isProvider || (ownerPreview && !!hospitalId),
    hospitalId,
    membershipStatus: status,
    hospitalName,
    tempExpiresAt: membership?.temp_expires_at ?? null,
    isOwnerPreview: ownerPreview,
  };
}

/**
 * DEMO ONLY — grants the current signed-in user provider role + membership at
 * the "MedP-AI Demo Clinic". Backed by a SECURITY DEFINER RPC scoped to auth.uid().
 */
export async function demoBypassVerification(): Promise<void> {
  const { error } = await supabase.rpc("demo_bypass_verification" as any);
  if (error) throw new Error(error.message || "Bypass failed");
}
