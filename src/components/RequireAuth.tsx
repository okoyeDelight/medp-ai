import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthSession } from "@/hooks/use-auth-session";
import { supabase } from "@/integrations/supabase/client";
import { fetchHealthProfile, acknowledgePrivacy } from "@/lib/healthProfile";
import { Loader2 } from "lucide-react";

const REMEMBER_KEY = "medp.rememberMe";
const SESSION_ONLY = "medp.sessionOnly";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuthSession();
  const location = useLocation();
  const [signingOut, setSigningOut] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [needsPrivacy, setNeedsPrivacy] = useState(false);

  // Honor remember-me: if remember NOT set AND we're in a fresh tab/cold start,
  // clear the persisted session so the user must sign in again.
  useEffect(() => {
    if (loading || !session) return;
    const remember = localStorage.getItem(REMEMBER_KEY);
    const sessionOnly = sessionStorage.getItem(SESSION_ONLY);
    if (!remember && !sessionOnly) {
      // No remember-me, and not the same browser session that signed in → log out
      setSigningOut(true);
      supabase.auth.signOut().finally(() => setSigningOut(false));
    }
  }, [loading, session]);

  // Privacy acknowledgement gate
  useEffect(() => {
    if (loading || !session) return;
    fetchHealthProfile()
      .then((p) => {
        if (!p.privacy_acknowledged_at) {
          // Auto-ack: user already had to tick the box at sign-in/sign-up
          return acknowledgePrivacy().then(() => setPrivacyChecked(true));
        }
        setPrivacyChecked(true);
      })
      .catch(() => {
        setNeedsPrivacy(true);
      });
  }, [loading, session]);

  if (loading || signingOut || (session && !privacyChecked && !needsPrivacy)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!session) {
    // First-time visitors get the MedP-AI intro experience before the sign-up screen.
    if (!localStorage.getItem("medp.introSeen")) {
      return <Navigate to="/welcome" replace />;
    }
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
