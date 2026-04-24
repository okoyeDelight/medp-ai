import { supabase } from "@/integrations/supabase/client";

let signingInPromise: Promise<void> | null = null;

/**
 * Ensure the user has a Supabase session. We use anonymous sign-in so the
 * Health Diary works seamlessly without forcing the user to register —
 * but their data is still owned by a stable user_id and protected by RLS.
 */
export async function ensureSession(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return;
  if (signingInPromise) return signingInPromise;

  signingInPromise = (async () => {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error("Anonymous sign-in failed", error);
      throw error;
    }
  })();

  try {
    await signingInPromise;
  } finally {
    signingInPromise = null;
  }
}
