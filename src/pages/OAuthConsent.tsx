import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";
import { Loader2, ShieldCheck, X } from "lucide-react";

// Minimal typed wrapper — the beta supabase.auth.oauth namespace may not be in
// the client's public types yet.
type AuthDetails = {
  redirect_url?: string;
  redirect_to?: string;
  client?: { name?: string; client_uri?: string; redirect_uris?: string[] };
  scope?: string;
};
type OAuthNs = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthDetails | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthDetails | null; error: { message: string } | null }>;
};
function getOAuth(): OAuthNs {
  const anyAuth = supabase.auth as unknown as { oauth: OAuthNs };
  return anyAuth.oauth;
}

function toRedirect(d: AuthDetails | null | undefined): string | undefined {
  return d?.redirect_url ?? d?.redirect_to;
}

const SCOPE_LABELS: Record<string, string> = {
  openid: "Verify your identity",
  email: "Share your email address",
  profile: "Share your basic profile",
};

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const authorizationId = params.get("authorization_id") ?? "";

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<AuthDetails | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id in URL.");
        setLoading(false);
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        // Preserve full consent URL so /auth returns the user here.
        const next = window.location.pathname + window.location.search;
        navigate(`/auth?next=${encodeURIComponent(next)}`, { replace: true });
        return;
      }
      setUserEmail(sess.session.user.email ?? null);
      try {
        const { data, error } = await getOAuth().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }
        const immediate = toRedirect(data);
        if (immediate && !data?.client) {
          window.location.href = immediate;
          return;
        }
        setDetails(data);
        setLoading(false);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Failed to load authorization.");
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [authorizationId, navigate]);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    try {
      const ns = getOAuth();
      const { data, error } = approve
        ? await ns.approveAuthorization(authorizationId)
        : await ns.denyAuthorization(authorizationId);
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
      const target = toRedirect(data);
      if (!target) {
        setError("No redirect returned by the authorization server.");
        setBusy(false);
        return;
      }
      window.location.href = target;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to complete authorization.");
      setBusy(false);
    }
  }

  const clientName = details?.client?.name ?? "an app";
  const scopes = (details?.scope ?? "openid email profile")
    .split(/\s+/)
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-md py-8">
        <div className="rounded-xl border-2 border-foreground bg-card p-6 shadow-brutal">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="font-mono-tech text-xs uppercase text-muted-foreground">
                Loading authorization…
              </p>
            </div>
          ) : error ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <X className="h-5 w-5 text-destructive" />
                <h1 className="font-display text-lg">Cannot load this request</h1>
              </div>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button
                variant="outline"
                className="w-full border-2 border-foreground"
                onClick={() => navigate("/", { replace: true })}
              >
                Back to app
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h1 className="font-display text-lg tracking-tight">
                  Connect {clientName} to MedP-AI
                </h1>
              </div>

              <p className="text-sm text-foreground/80">
                This lets <strong>{clientName}</strong> use MedP-AI as you while you
                are signed in.
              </p>

              <div className="rounded-lg border-2 border-foreground bg-muted p-3 text-xs">
                <p className="font-mono-tech uppercase text-muted-foreground">
                  Signed in as
                </p>
                <p className="mt-0.5 font-medium">{userEmail ?? "—"}</p>
              </div>

              <div className="space-y-2">
                <p className="font-mono-tech text-[10px] uppercase text-muted-foreground">
                  It will be able to
                </p>
                <ul className="space-y-1.5 text-sm">
                  {scopes.map((s) => (
                    <li key={s} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{SCOPE_LABELS[s] ?? `Additional permission: ${s}`}</span>
                    </li>
                  ))}
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>Call MedP-AI tools on your behalf (subject to app permissions).</span>
                  </li>
                </ul>
              </div>

              <p className="text-[11px] text-muted-foreground">
                This does not bypass MedP-AI's permissions or backend policies. Your
                data stays scoped to your account.
              </p>

              <div className="flex flex-col gap-2 pt-1">
                <Button
                  size="lg"
                  disabled={busy}
                  onClick={() => decide(true)}
                  className="w-full border-2 border-foreground bg-primary font-display uppercase text-primary-foreground shadow-brutal-sm"
                >
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  disabled={busy}
                  onClick={() => decide(false)}
                  className="w-full border-2 border-foreground font-display uppercase"
                >
                  Cancel connection
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
