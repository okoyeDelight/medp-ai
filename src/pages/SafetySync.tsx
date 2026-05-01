import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { LegalFooter } from "@/components/LegalFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchHealthProfile,
  updateHealthProfile,
  type HealthProfile,
  type HmoProvider,
} from "@/lib/healthProfile";
import { toast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  Lock,
  Loader2,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from "lucide-react";

const HMOS: { name: HmoProvider; tag: string; color: string }[] = [
  { name: "Reliance Health", tag: "Tier 1 HMO", color: "bg-emerald-500" },
  { name: "Avon HMO", tag: "Tier 1 HMO", color: "bg-blue-500" },
  { name: "AXA Mansard", tag: "Tier 1 HMO", color: "bg-indigo-500" },
];

const SafetySync = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [memberId, setMemberId] = useState("");

  useEffect(() => {
    fetchHealthProfile()
      .then((p) => {
        setProfile(p);
        setMemberId(p.hmo_member_id ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  async function setProvider(name: HmoProvider) {
    if (!profile) return;
    setSaving(true);
    try {
      await updateHealthProfile({ hmo_provider: name });
      setProfile({ ...profile, hmo_provider: name });
      toast({ title: name ? `Linked to ${name}` : "HMO unlinked" });
    } catch (e) {
      toast({ title: "Save failed", description: errMsg(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function saveMemberId() {
    if (!profile) return;
    setSaving(true);
    try {
      await updateHealthProfile({ hmo_member_id: memberId.trim() || null });
      setProfile({ ...profile, hmo_member_id: memberId.trim() || null });
      toast({ title: "Member ID saved" });
    } catch (e) {
      toast({ title: "Save failed", description: errMsg(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function togglePrivacyGuard(v: boolean) {
    if (!profile) return;
    try {
      await updateHealthProfile({ privacy_guard: v });
      setProfile({ ...profile, privacy_guard: v });
    } catch (e) {
      toast({ title: "Save failed", description: errMsg(e), variant: "destructive" });
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-2xl py-6 space-y-6">
        <section className="space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-foreground bg-primary px-3 py-1 font-mono-tech text-[10px] font-bold uppercase text-primary-foreground shadow-brutal-sm">
            <Stethoscope className="h-3 w-3" /> HMO Sync · NDPR-secure
          </span>
          <h1 className="font-display text-3xl leading-[1.05]">
            Safety <span className="text-primary">Sync</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Link your HMO so your pharmacist and triaging doctor see the same medication picture
            you do. Encrypted under Nigerian NDPR rules.
          </p>
        </section>

        {loading || !profile ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* HMO selector */}
            <section className="rounded-xl border-2 border-foreground bg-card p-5 shadow-brutal space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg uppercase">Your HMO</h2>
                {profile.hmo_provider && (
                  <span className="inline-flex items-center gap-1 rounded-full border-2 border-safe bg-safe/10 px-2 py-0.5 font-mono-tech text-[10px] uppercase text-safe">
                    <CheckCircle2 className="h-3 w-3" /> Linked
                  </span>
                )}
              </div>
              <div className="grid gap-2">
                {HMOS.map((h) => {
                  const active = profile.hmo_provider === h.name;
                  return (
                    <button
                      key={h.name}
                      type="button"
                      disabled={saving}
                      onClick={() => setProvider(active ? null : h.name)}
                      className={`flex items-center gap-3 rounded-lg border-2 border-foreground p-3 text-left shadow-brutal-sm brutal-press transition ${
                        active ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                      }`}
                    >
                      <span className={`h-9 w-9 shrink-0 rounded-md border-2 border-foreground ${h.color}`} />
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-sm uppercase leading-tight">{h.name}</p>
                        <p className="text-xs opacity-80">{h.tag}</p>
                      </div>
                      <span className="font-mono-tech text-[10px] uppercase">
                        {active ? "Unlink" : "Link"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {profile.hmo_provider && (
                <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3">
                  <Label htmlFor="mid" className="font-mono-tech text-[10px] uppercase">
                    Member ID
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="mid"
                      value={memberId}
                      onChange={(e) => setMemberId(e.target.value)}
                      placeholder="e.g. RHC-1234567"
                      className="border-2 border-foreground"
                    />
                    <Button
                      onClick={saveMemberId}
                      disabled={saving}
                      className="border-2 border-foreground bg-primary font-display uppercase text-primary-foreground shadow-brutal-sm"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              )}
            </section>

            {/* Privacy Guard */}
            <section className="rounded-xl border-2 border-foreground bg-card p-5 shadow-brutal space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-lg uppercase">Privacy Guard</h2>
                </div>
                <Switch
                  checked={profile.privacy_guard}
                  onCheckedChange={togglePrivacyGuard}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                When ON, your medication and herbal use data is encrypted in transit and at rest
                under <strong>Nigerian Data Protection Regulation (NDPR)</strong> standards. Your
                HMO sees only the minimum needed to authorise care.
              </p>
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                <p className="font-mono-tech text-[10px] uppercase text-foreground">What we share</p>
                <ul className="mt-1 space-y-0.5">
                  <li>• Active medication list (no diary entries)</li>
                  <li>• Critical allergy & condition flags</li>
                  <li>• Vitals trend summaries (with your tap-to-share)</li>
                </ul>
              </div>
            </section>

            {/* Coming-soon banner */}
            <section className="rounded-xl border-2 border-foreground bg-accent p-5 shadow-brutal text-accent-foreground">
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-display text-base uppercase">Real-time auth coming</p>
                  <p className="text-sm">
                    Direct API authorisation with Reliance, Avon and AXA Mansard pharmacies is in
                    pilot. For now, your linked HMO is shown on your doctor's report.
                  </p>
                </div>
              </div>
            </section>

            <p className="text-center font-mono-tech text-[10px] uppercase text-muted-foreground">
              <ShieldCheck className="mr-1 inline-block h-3 w-3" /> Encrypted · NDPR compliant
            </p>
          </>
        )}
      </main>
      <LegalFooter />
    </div>
  );
};

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Try again.";
}

export default SafetySync;
