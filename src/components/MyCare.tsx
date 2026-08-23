import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ChevronRight, NotebookPen, Pill, Shield, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type CareItem = {
  id: string;
  title: string;
  detail: string;
  to: string;
  icon: typeof Stethoscope;
};

const QUICK_LINKS = [
  { label: "Health diary", to: "/diary", icon: NotebookPen },
  { label: "Vitals", to: "/health-sync", icon: Activity },
  { label: "Safety check", to: "/safety-scan", icon: Shield },
  { label: "Medicine help", to: "/chemists", icon: Pill },
];

/**
 * "My Care" — shows only real, current care activity for the signed-in patient.
 * No fabricated doctors, prescriptions or records: empty state when there is no data.
 */
export function MyCare() {
  const [items, setItems] = useState<CareItem[] | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        const uid = session.session?.user?.id;
        if (!uid) {
          if (mounted) setItems([]);
          return;
        }
        const { data } = await supabase
          .from("triage_sessions")
          .select("id, status, created_at, symptom_category")
          .eq("patient_id", uid)
          .order("created_at", { ascending: false })
          .limit(3);

        const open = (data ?? []).filter(
          (s) => !["cancelled", "concluded", "expired"].includes(String(s.status)),
        );
        if (mounted) {
          setItems(
            open.map((s) => ({
              id: s.id,
              title: s.status === "claimed" ? "Doctor is with you" : "Waiting for a doctor",
              detail: s.symptom_category
                ? `About: ${s.symptom_category}`
                : "Open your consultation to continue",
              to: "/triage",
              icon: Stethoscope,
            })),
          );
        }
      } catch {
        if (mounted) setItems([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section id="my-care" className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg uppercase">My care</h2>
        <Link to="/diary" className="font-mono-tech text-[10px] uppercase text-muted-foreground hover:text-foreground">
          History
        </Link>
      </div>

      {items === null ? (
        <div className="h-24 animate-pulse rounded-xl border-2 border-dashed border-foreground/30 bg-muted" />
      ) : items.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-foreground/40 bg-muted p-6 text-center">
          <p className="font-display text-base leading-tight">Nothing needs your attention</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your care journey will appear here as you use MedP-AI.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((i) => (
            <li key={i.id}>
              <Link
                to={i.to}
                className="flex items-center gap-3 rounded-xl border-2 border-foreground bg-card p-4 shadow-brutal-sm brutal-press hover:bg-secondary"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 border-foreground bg-primary text-primary-foreground shadow-brutal-sm">
                  <i.icon className="h-5 w-5" strokeWidth={2.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm leading-tight">{i.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{i.detail}</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-2">
        {QUICK_LINKS.map((q) => (
          <Link
            key={q.to}
            to={q.to}
            className="flex min-h-11 items-center gap-2 rounded-xl border-2 border-foreground bg-card px-3 py-2.5 text-xs font-semibold shadow-brutal-sm brutal-press hover:bg-secondary"
          >
            <q.icon className="h-4 w-4 text-primary" strokeWidth={2.5} />
            {q.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
