import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { findInDatabase, type NafdacEntry } from "@/data/nafdacDatabase";
import {
  fetchHealthProfile,
  type HealthProfile,
} from "@/lib/healthProfile";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  XCircle,
  Heart,
} from "lucide-react";
import { LegalFooter } from "@/components/LegalFooter";

interface ScanResult extends NafdacEntry {
  ai_assisted?: boolean;
}

interface IntersectionFinding {
  level: "critical" | "danger" | "caution";
  title: string;
  detail: string;
}

const SafetyScan = () => {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [profile, setProfile] = useState<HealthProfile | null>(null);

  useEffect(() => {
    fetchHealthProfile().then(setProfile).catch(() => {});
  }, []);

  async function handleScan(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    setResult(null);

    // 1) curated DB
    const local = findInDatabase(query);
    if (local) {
      setResult(local);
      setBusy(false);
      return;
    }

    // 2) AI fallback
    try {
      const { data, error } = await supabase.functions.invoke("nafdac-lookup", {
        body: { query: query.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const r = data.result;
      setResult({
        key: query.toLowerCase(),
        productName: r.productName,
        botanical: r.botanical,
        nafdacNumber: r.nafdacNumber ?? null,
        manufacturer: r.manufacturer,
        status: r.status,
        indications: r.indications ?? [],
        dose: r.dose,
        administration: r.administration,
        properties: r.properties ?? [],
        contraindications: r.contraindications ?? [],
        drugInteractions: r.drugInteractions ?? [],
        sideEffects: r.sideEffects ?? [],
        ai_assisted: true,
      });
    } catch (err) {
      toast({
        title: "Lookup failed",
        description: err instanceof Error ? err.message : "Try again later.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  const findings = computeIntersections(result, profile);
  const isHighStimulant = result?.properties.some(
    (p) => p === "Stimulant" || p === "Hypertensive",
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-2xl py-6 space-y-6">
        <section className="space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-foreground bg-primary px-3 py-1 font-mono-tech text-[10px] font-bold uppercase text-primary-foreground shadow-brutal-sm">
            <Shield className="h-3 w-3" /> NAFDAC + Safety Scan
          </span>
          <h1 className="font-display text-3xl leading-[1.05]">
            Verify a <span className="text-primary">supplement</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Scan a herbal product to check NAFDAC registration and run a safety check against
            your conditions and medications.
          </p>
        </section>

        {/* Search */}
        <form
          onSubmit={handleScan}
          className="rounded-xl border-2 border-foreground bg-card p-4 shadow-brutal space-y-3"
        >
          <Label htmlFor="q" className="font-mono-tech text-[10px] uppercase">
            Product name, herb, or NAFDAC number
          </Label>
          <div className="flex gap-2">
            <Input
              id="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Yoyo Bitters, Moringa, A7-0696L"
              className="border-2 border-foreground"
              autoFocus
            />
            <Button
              type="submit"
              disabled={busy || query.trim().length < 2}
              className="border-2 border-foreground bg-primary font-display uppercase text-primary-foreground shadow-brutal-sm brutal-press"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Scan
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            We check our curated NAFDAC list first, then ask AI to fill gaps. Always verify with
            NAFDAC's Greenbook for clinical decisions.
          </p>
        </form>

        {/* Live Vitals hook (mock) */}
        {result && (
          <LiveVitalsMock spike={isHighStimulant ?? false} />
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4 animate-fade-up">
            {/* Header card with status */}
            <RegistrationCard r={result} />

            {/* Intersection findings */}
            {findings.length > 0 && (
              <div className="space-y-2">
                {findings.map((f, i) => (
                  <FindingCard key={i} f={f} />
                ))}
              </div>
            )}
            {profile && findings.length === 0 && (
              <div className="flex items-start gap-2 rounded-xl border-2 border-safe bg-safe/10 p-4">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-safe" />
                <div className="text-sm">
                  <p className="font-display uppercase text-safe">No conflicts found</p>
                  <p className="text-muted-foreground">
                    Based on your active conditions and medications. Always confirm with a pharmacist.
                  </p>
                </div>
              </div>
            )}
            {!profile && (
              <div className="flex items-start gap-2 rounded-xl border-2 border-foreground bg-accent/40 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="text-sm">
                  <p className="font-display uppercase">Add your health profile</p>
                  <p className="text-muted-foreground">
                    Set conditions and medications in{" "}
                    <Link to="/profile" className="font-semibold text-primary underline">
                      Profile
                    </Link>{" "}
                    so we can run a personalised safety check.
                  </p>
                </div>
              </div>
            )}

            {/* Indications */}
            <DetailCard title="What it's used for" icon={<CheckCircle2 className="h-4 w-4" />}>
              <ul className="grid grid-cols-2 gap-1.5 text-sm">
                {result.indications.map((i) => (
                  <li key={i} className="rounded-md bg-muted px-2 py-1">
                    {i}
                  </li>
                ))}
              </ul>
            </DetailCard>

            {/* Dose & administration */}
            <DetailCard title="Dose & how to take" icon={<Sparkles className="h-4 w-4" />}>
              <p className="font-display text-lg">{result.dose}</p>
              <p className="mt-1 text-sm text-muted-foreground">{result.administration}</p>
            </DetailCard>

            {/* Contraindications */}
            <DetailCard
              title="Don't take it if you have"
              icon={<XCircle className="h-4 w-4 text-danger" />}
            >
              <ul className="space-y-1 text-sm">
                {result.contraindications.map((c) => (
                  <li key={c} className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
                    {c}
                  </li>
                ))}
              </ul>
            </DetailCard>

            {/* Drug interactions */}
            <DetailCard
              title="Drug-drug interactions"
              icon={<AlertTriangle className="h-4 w-4 text-caution" />}
            >
              <ul className="space-y-2 text-sm">
                {result.drugInteractions.map((d) => (
                  <li
                    key={d.drug}
                    className={`rounded-md border-l-4 p-2 ${
                      d.severity === "danger"
                        ? "border-danger bg-danger/10"
                        : "border-caution bg-caution/10"
                    }`}
                  >
                    <p className="font-display uppercase">{d.drug}</p>
                    <p className="text-xs text-muted-foreground">{d.why}</p>
                  </li>
                ))}
              </ul>
            </DetailCard>

            {/* Side effects */}
            <DetailCard title="Possible side effects" icon={<AlertCircle className="h-4 w-4" />}>
              <p className="text-sm text-muted-foreground">{result.sideEffects.join(" · ")}</p>
            </DetailCard>

            {result.ai_assisted && (
              <p className="text-center font-mono-tech text-[10px] uppercase text-muted-foreground">
                ⚠ AI-assisted result — verify with a licensed pharmacist
              </p>
            )}
          </div>
        )}
      </main>
      <LegalFooter />
    </div>
  );
};

function RegistrationCard({ r }: { r: ScanResult }) {
  const tone =
    r.status === "registered"
      ? "border-safe bg-safe/10"
      : r.status === "expired"
        ? "border-caution bg-caution/10"
        : r.status === "unregistered"
          ? "border-danger bg-danger/10"
          : "border-foreground bg-muted";
  const Icon =
    r.status === "registered"
      ? ShieldCheck
      : r.status === "unregistered"
        ? ShieldAlert
        : Shield;
  return (
    <div className={`rounded-xl border-2 p-4 shadow-brutal ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono-tech text-[10px] uppercase text-muted-foreground">
            {r.botanical}
          </p>
          <h3 className="font-display text-lg leading-tight">{r.productName}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{r.manufacturer}</p>
        </div>
        <Icon className="h-7 w-7 shrink-0" strokeWidth={2.2} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge
          className={`border-2 border-foreground font-mono-tech uppercase ${
            r.status === "registered"
              ? "bg-safe text-safe-foreground"
              : r.status === "unregistered"
                ? "bg-danger text-danger-foreground"
                : "bg-muted text-foreground"
          }`}
        >
          {r.status === "registered" ? "NAFDAC Registered" : r.status}
        </Badge>
        {r.nafdacNumber && (
          <span className="rounded-md border-2 border-foreground bg-card px-2 py-0.5 font-mono-tech text-xs">
            {r.nafdacNumber}
          </span>
        )}
      </div>
    </div>
  );
}

function FindingCard({ f }: { f: IntersectionFinding }) {
  const isCritical = f.level === "critical";
  const tone =
    f.level === "critical"
      ? "border-danger bg-danger/15 pulse-danger"
      : f.level === "danger"
        ? "border-danger bg-danger/10"
        : "border-caution bg-caution/10";
  return (
    <div className={`rounded-xl border-2 p-4 shadow-brutal ${tone}`}>
      <div className="flex items-start gap-2">
        {isCritical ? (
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-danger" strokeWidth={2.5} />
        ) : (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.5} />
        )}
        <div>
          <p className="font-display uppercase">
            {isCritical ? "🚨 Critical alert" : f.level === "danger" ? "Danger: Interaction Detected" : "Caution"}
          </p>
          <p className="font-display text-base">{f.title}</p>
          <p className="mt-1 text-sm">{f.detail}</p>
        </div>
      </div>
    </div>
  );
}

function DetailCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border-2 border-foreground bg-card p-4 shadow-brutal">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <h3 className="font-display text-sm uppercase">{title}</h3>
      </div>
      {children}
    </div>
  );
}

/** UI placeholder for Live Vitals Sync — the line "spikes red" if a stimulant herb is selected. */
function LiveVitalsMock({ spike }: { spike: boolean }) {
  // 24 mock points; if spike, ramp upward at the end and color red.
  const points = Array.from({ length: 24 }, (_, i) => {
    const base = 72 + Math.sin(i / 2) * 4;
    if (spike && i > 14) return base + (i - 14) * 4 + Math.random() * 3;
    return base + Math.random() * 2;
  });
  const max = Math.max(...points);
  const min = Math.min(...points);
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * 300;
      const y = 60 - ((p - min) / Math.max(1, max - min)) * 50;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  return (
    <div
      className={`rounded-xl border-2 p-4 shadow-brutal ${
        spike ? "border-danger bg-danger/5" : "border-foreground bg-card"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart
            className={`h-4 w-4 ${spike ? "text-danger" : "text-primary"}`}
            strokeWidth={3}
          />
          <h3 className="font-display text-sm uppercase">Live Vitals (preview)</h3>
        </div>
        <span
          className={`font-mono-tech text-xs ${
            spike ? "text-danger" : "text-muted-foreground"
          }`}
        >
          {Math.round(points[points.length - 1])} bpm
        </span>
      </div>
      <svg viewBox="0 0 300 70" className="h-16 w-full">
        <path
          d={path}
          fill="none"
          stroke={spike ? "hsl(var(--danger))" : "hsl(var(--primary))"}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="mt-1 font-mono-tech text-[10px] uppercase text-muted-foreground">
        {spike
          ? "⚠ Stimulant detected — projected BPM rise"
          : "Mock signal — link a wearable to stream real-time HR"}
      </p>
    </div>
  );
}

function computeIntersections(
  r: ScanResult | null,
  p: HealthProfile | null,
): IntersectionFinding[] {
  if (!r || !p) return [];
  const out: IntersectionFinding[] = [];
  const cond = p.active_conditions.map((c) => c.toLowerCase());
  const meds = p.active_medications.map((m) => m.toLowerCase());

  // Stimulant + hypertension = CRITICAL
  if (
    (r.properties.includes("Stimulant") || r.properties.includes("Hypertensive")) &&
    cond.some((c) => c.includes("hypertension"))
  ) {
    out.push({
      level: "critical",
      title: `${r.productName} can spike your blood pressure`,
      detail: `It contains stimulant / pressor compounds. With your hypertension this could trigger a hypertensive episode.`,
    });
  }
  // Blood thinner + warfarin = DANGER
  if (r.properties.includes("Blood Thinner") && meds.some((m) => m.includes("warfarin"))) {
    out.push({
      level: "danger",
      title: "Bleeding risk with Warfarin",
      detail: `${r.productName} has blood-thinning effects. Combined with Warfarin this significantly raises bleeding risk.`,
    });
  }
  // Hypoglycaemic + diabetes meds
  if (
    r.properties.includes("Hypoglycaemic") &&
    meds.some((m) => m.includes("metformin") || m.includes("insulin"))
  ) {
    out.push({
      level: "danger",
      title: "Risk of low blood sugar",
      detail: `${r.productName} can lower blood sugar. With your diabetes medication this can cause hypoglycaemia.`,
    });
  }
  // Hepatotoxic + liver disease
  if (r.properties.includes("Hepatotoxic Risk") && cond.some((c) => c.includes("liver"))) {
    out.push({
      level: "critical",
      title: "Liver injury risk",
      detail: `${r.productName} has reported hepatotoxicity. With your liver condition, do NOT use without specialist clearance.`,
    });
  }
  // Pregnancy
  if (
    cond.some((c) => c.includes("pregnan")) &&
    r.contraindications.some((c) => c.toLowerCase().includes("pregnan"))
  ) {
    out.push({
      level: "critical",
      title: "Not safe in pregnancy",
      detail: `${r.productName} is contraindicated in pregnancy. Stop use and speak to your obstetrician.`,
    });
  }
  // Generic drug-interaction matches against med list
  for (const di of r.drugInteractions) {
    if (meds.some((m) => di.drug.toLowerCase().includes(m) || m.includes(di.drug.toLowerCase()))) {
      out.push({
        level: di.severity === "danger" ? "danger" : "caution",
        title: `Interacts with ${di.drug}`,
        detail: di.why,
      });
    }
  }
  return out;
}

export default SafetyScan;
