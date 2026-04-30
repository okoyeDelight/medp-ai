import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the current user id, or null if not signed in.
 * No anonymous fallback — users must register/sign in.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

/** Throws if user not signed in. Use in code paths that require auth. */
export async function requireUserId(): Promise<string> {
  const uid = await getCurrentUserId();
  if (!uid) throw new Error("You need to sign in first.");
  return uid;
}
