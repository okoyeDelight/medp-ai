import { Cross, Stethoscope } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { VitalsCheck } from "@/components/VitalsCheck";
import { LanguageToggle, useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { isOwnerPreview } from "@/lib/providerAuth";


export function AppHeader() {
  const { t } = useI18n();
  const loc = useLocation();
  const [isClinical, setIsClinical] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user;
      if (!u) { if (mounted) setIsClinical(false); return; }
      const email = u.email?.toLowerCase();
      if (email === FOUNDER_EMAIL) { if (mounted) setIsClinical(true); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.id);
      if (mounted) setIsClinical(!!roles?.some(
        (r) => r.role === "provider" || r.role === "hospital_admin" || r.role === "platform_admin",
      ));
    })();
    return () => { mounted = false; };
  }, [loc.pathname]);

  return (
    <header className="sticky top-0 z-30 border-b-2 border-foreground bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-foreground bg-primary text-primary-foreground shadow-brutal-sm">
            <Cross className="h-5 w-5" strokeWidth={3} />
          </div>
          <div className="leading-tight">
            <p className="font-display text-lg tracking-tight">MedP-AI</p>
            <p className="font-mono-tech text-[10px] uppercase text-muted-foreground">
              {t("app.tagline")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          {/* Clinical toggle only shown to users with a clinical role (strict RBAC) */}
          {isClinical && (
            <Link
              to="/select-workspace"
              className="hidden items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-primary transition hover:bg-primary/10 sm:inline-flex"
            >
              <Stethoscope className="h-3.5 w-3.5" />
              {t("provider.portal")}
            </Link>
          )}
          {isClinical && (
            <Link
              to="/select-workspace"
              aria-label={t("provider.portal")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-primary/30 bg-primary/5 text-primary transition hover:bg-primary/10 sm:hidden"
            >
              <Stethoscope className="h-4 w-4" />
            </Link>
          )}
          <VitalsCheck />
        </div>
      </div>
    </header>
  );
}
