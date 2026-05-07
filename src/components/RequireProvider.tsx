import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuthSession } from "@/hooks/use-auth-session";
import { fetchProviderStatus, type ProviderStatus } from "@/lib/providerAuth";
import "@/styles/clinical.css";

export function RequireProvider({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuthSession();
  const location = useLocation();
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      setChecking(false);
      return;
    }
    fetchProviderStatus()
      .then(setStatus)
      .finally(() => setChecking(false));
  }, [loading, session]);

  if (loading || checking) {
    return (
      <div className="theme-clinical flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!session) {
    return <Navigate to="/provider/auth" replace state={{ from: location.pathname }} />;
  }
  if (!status?.isProvider || !status.hospitalId) {
    return <Navigate to="/provider/pending" replace />;
  }
  return <div className="theme-clinical">{children}</div>;
}
