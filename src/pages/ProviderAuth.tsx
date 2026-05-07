import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Stethoscope, ShieldCheck } from "lucide-react";
import { fetchProviderStatus } from "@/lib/providerAuth";
import "@/styles/clinical.css";

const schema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(1, "Required").max(128),
});

export default function ProviderAuth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) await routeAfterAuth(navigate);
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (error) throw error;
      await routeAfterAuth(navigate);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="theme-clinical min-h-screen">
      <main className="container max-w-md py-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Stethoscope className="h-7 w-7" />
          </div>
          <h1 className="font-display text-2xl">Clinical Desk</h1>
          <p className="mt-1 text-sm text-muted-foreground">Provider sign-in · MedP-AI Hospital Network</p>
        </div>

        <Card className="border shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" /> Verified provider access only
            </CardTitle>
            <CardDescription className="text-xs">
              Patient-facing accounts cannot view this dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="p-email">Work email</Label>
                <Input
                  id="p-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@hospital.org"
                  autoComplete="username"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-password">Password</Label>
                <Input
                  id="p-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <Button type="submit" disabled={busy} className="w-full">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign in to Clinical Desk
              </Button>
            </form>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Patient?{" "}
              <Link to="/auth" className="font-medium text-primary underline">
                Use the patient app
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

async function routeAfterAuth(navigate: (p: string, opts?: { replace: boolean }) => void) {
  const status = await fetchProviderStatus();
  if (!status.isProvider || !status.hospitalId) {
    navigate("/provider/pending", { replace: true });
  } else {
    navigate("/hospital-dashboard", { replace: true });
  }
}
