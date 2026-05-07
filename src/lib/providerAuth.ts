import { supabase } from "@/integrations/supabase/client";

export interface ProviderStatus {
  isProvider: boolean;
  hospitalId: string | null;
  membershipStatus: "pending_verification" | "temporary" | "active" | "revoked" | null;
  hospitalName: string | null;
  tempExpiresAt: string | null;
}

/** Server-side authoritative check (RLS scoped to auth.uid()). */
export async function fetchProviderStatus(): Promise<ProviderStatus> {
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("role", "provider");
  const isProvider = !!roles?.length;

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

  return {
    isProvider,
    hospitalId: verifiedActive ? membership?.hospital_id ?? null : null,
    membershipStatus: status,
    hospitalName: (membership as any)?.hospitals?.name ?? null,
    tempExpiresAt: membership?.temp_expires_at ?? null,
  };
}
