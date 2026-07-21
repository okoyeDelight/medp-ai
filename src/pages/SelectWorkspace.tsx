import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, HeartPulse, Stethoscope, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const FOUNDER_EMAIL = "chinedubisiola04@gmail.com";

export default function SelectWorkspace() {
  const nav = useNavigate();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [hasClinical, setHasClinical] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const s = data.session;
      if (!s) { nav("/auth", { replace: true }); return; }
      const email = s.user.email?.toLowerCase();
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", s.user.id);
      const isClinical =
        email === FOUNDER_EMAIL ||
        !!roles?.some((r) => r.role === "provider" || r.role === "hospital_admin" || r.role === "platform_admin");
      // Strict RBAC: patients never see the switcher — go straight to patient home.
      if (!isClinical) { nav("/", { replace: true }); return; }
      setHasClinical(true);
      setLoading(false);
    })();
  }, [nav]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary/5">
      <AppHeader />
      <main className="container max-w-3xl px-4 py-10">
        <h1 className="mb-2 font-display text-2xl">{t("workspace.select")}</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          You have access to more than one workspace on this account.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <button onClick={() => nav("/", { replace: true })} className="text-left">
            <Card className="h-full border-2 transition hover:border-primary hover:shadow-brutal">
              <CardContent className="space-y-3 p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <HeartPulse className="h-6 w-6" />
                </div>
                <div className="font-display text-lg">{t("workspace.patient")}</div>
                <p className="text-sm text-muted-foreground">{t("workspace.patient.desc")}</p>
                <div className="flex items-center gap-1 text-sm text-primary">
                  {t("workspace.continue")} <ArrowRight className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </button>
          {hasClinical && (
            <button onClick={() => nav("/triage-desk", { replace: true })} className="text-left">
              <Card className="h-full border-2 transition hover:border-primary hover:shadow-brutal">
                <CardContent className="space-y-3 p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                    <Stethoscope className="h-6 w-6" />
                  </div>
                  <div className="font-display text-lg">{t("workspace.clinical")}</div>
                  <p className="text-sm text-muted-foreground">{t("workspace.clinical.desc")}</p>
                  <div className="flex items-center gap-1 text-sm text-primary">
                    {t("workspace.continue")} <ArrowRight className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
