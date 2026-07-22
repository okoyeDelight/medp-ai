import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Hourglass, LogOut, Wand2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchProviderStatus, demoBypassVerification, type ProviderStatus } from "@/lib/providerAuth";
import { toast } from "sonner";
import "@/styles/clinical.css";

export default function ProviderPending() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [bypassing, setBypassing] = useState(false);

  useEffect(() => {
    fetchProviderStatus().then((s) => {
      setStatus(s);
      if (s.isFounder || (s.isProvider && s.hospitalId)) {
        navigate("/hospital-dashboard", { replace: true });
      }
    });
  }, [navigate]);

  async function logout() {
    await supabase.auth.signOut();
    navigate("/provider/auth", { replace: true });
  }

  async function bypass() {
    setBypassing(true);
    try {
      await demoBypassVerification();
      toast.success("Verified! Loading Clinical Desk…");
      navigate("/hospital-dashboard", { replace: true });
    } catch (e: any) {
      toast.error(e.message ?? "Bypass failed");
    } finally {
      setBypassing(false);
    }
  }

  return (
    <div className="theme-clinical min-h-screen">
      <main className="container max-w-md py-10">
        <Card className="border shadow-lg">
          <CardHeader className="items-center text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
              <Hourglass className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="font-display text-xl">Pending Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Your account is not yet a verified provider at any hospital. Access to the Clinical Desk is
              blocked until a hospital administrator approves your membership.
            </p>
            {status?.membershipStatus && (
              <div className="rounded-lg border bg-muted/40 p-3">
                <div className="text-xs uppercase text-muted-foreground">Current status</div>
                <div className="mt-1 font-display">{status.membershipStatus.replace("_", " ")}</div>
                {status.hospitalName && (
                  <div className="mt-1 text-xs text-muted-foreground">at {status.hospitalName}</div>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              If you believe this is a mistake, contact your hospital administrator.
            </p>

            <div className="rounded-lg border border-dashed border-amber-500/50 bg-amber-500/5 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
                <Wand2 className="h-3.5 w-3.5" /> Demo mode
              </div>
              <p className="mb-2 text-xs text-muted-foreground">
                Skip admin approval for pitches & testing. Grants you provider role at the
                <b> MedP-AI Demo Clinic</b> instantly.
              </p>
              <Button className="w-full" onClick={bypass} disabled={bypassing}>
                {bypassing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                Bypass Verification (Demo)
              </Button>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" asChild>
                <Link to="/">Back to app</Link>
              </Button>
              <Button variant="destructive" className="flex-1" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
