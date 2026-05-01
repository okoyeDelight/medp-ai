import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import {
  Activity,
  Heart,
  Loader2,
  LogOut,
  Plus,
  Pill,
  ShieldAlert,
  Stethoscope,
  Trash2,
  User as UserIcon,
  X,
} from "lucide-react";
import {
  COMMON_CONDITIONS,
  COMMON_MEDICATIONS,
  fetchHealthProfile,
  updateHealthProfile,
  type HealthProfile,
} from "@/lib/healthProfile";
import {
  bpCategory,
  deleteVitals,
  fetchVitals,
  type VitalsLog,
} from "@/lib/vitals";

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuthSession();
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [vitals, setVitals] = useState<VitalsLog[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchHealthProfile().then((p) => {
      setProfile(p);
      setDisplayName(p.display_name ?? "");
    });
    fetchVitals(90).then(setVitals).catch(() => {});
  }, [user]);

  async function saveName() {
    setSavingName(true);
    try {
      await updateHealthProfile({ display_name: displayName.trim() });
      toast({ title: "Saved ✅", description: "Profile updated." });
    } catch (err) {
      toast({ title: "Couldn't save", description: errMsg(err), variant: "destructive" });
    } finally {
      setSavingName(false);
    }
  }

  async function toggleItem(field: "active_conditions" | "active_medications", item: string) {
    if (!profile) return;
    const cur = profile[field];
    const next = cur.includes(item) ? cur.filter((x) => x !== item) : [...cur, item];
    const updated = { ...profile, [field]: next };
    setProfile(updated);
    try {
      await updateHealthProfile({ [field]: next } as Partial<HealthProfile>);
    } catch (err) {
      setProfile(profile);
      toast({ title: "Save failed", description: errMsg(err), variant: "destructive" });
    }
  }

  async function addCustom(field: "active_conditions" | "active_medications", value: string) {
    if (!profile || !value.trim()) return;
    const v = value.trim();
    if (profile[field].includes(v)) return;
    const next = [...profile[field], v];
    const updated = { ...profile, [field]: next };
    setProfile(updated);
    try {
      await updateHealthProfile({ [field]: next } as Partial<HealthProfile>);
    } catch (err) {
      setProfile(profile);
      toast({ title: "Save failed", description: errMsg(err), variant: "destructive" });
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    // Clear remember-me preference too
    localStorage.removeItem("medp.rememberMe");
    navigate("/auth", { replace: true });
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const { error } = await supabase.rpc("delete_my_account");
      if (error) throw error;
      await supabase.auth.signOut();
      toast({
        title: "Account data removed",
        description: "Your medication history and profile have been permanently deleted.",
      });
      navigate("/auth", { replace: true });
    } catch (err) {
      toast({ title: "Deletion failed", description: errMsg(err), variant: "destructive" });
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

  async function removeVital(id: string) {
    try {
      await deleteVitals(id);
      setVitals((v) => v.filter((x) => x.id !== id));
    } catch (err) {
      toast({ title: "Delete failed", description: errMsg(err), variant: "destructive" });
    }
  }

  if (loading || !user || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-2xl py-6 space-y-6">
        <section className="space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-foreground bg-accent px-3 py-1 font-mono-tech text-[10px] font-bold uppercase text-accent-foreground shadow-brutal-sm">
            <UserIcon className="h-3 w-3" /> Profile
          </span>
          <h1 className="font-display text-3xl leading-[1.05]">
            Your <span className="text-primary">account</span>
          </h1>
        </section>

        {/* Account card */}
        <section className="rounded-xl border-2 border-foreground bg-card p-5 shadow-brutal space-y-4">
          <div className="space-y-1.5">
            <Label className="font-mono-tech text-[10px] uppercase">Email</Label>
            <p className="font-display text-base">{user.email}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dn" className="font-mono-tech text-[10px] uppercase">Display name</Label>
            <div className="flex gap-2">
              <Input
                id="dn"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="border-2 border-foreground"
                maxLength={60}
              />
              <Button
                onClick={saveName}
                disabled={savingName}
                className="border-2 border-foreground bg-primary font-display uppercase text-primary-foreground shadow-brutal-sm brutal-press"
              >
                {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/safety-sync"
              className="rounded-lg border-2 border-foreground bg-card px-3 py-2 text-center font-mono-tech text-[10px] uppercase shadow-brutal-sm brutal-press"
            >
              <Stethoscope className="mr-1 inline-block h-3 w-3" /> HMO Sync
            </Link>
            <Link
              to="/safety-scan"
              className="rounded-lg border-2 border-foreground bg-card px-3 py-2 text-center font-mono-tech text-[10px] uppercase shadow-brutal-sm brutal-press"
            >
              Verify NAFDAC
            </Link>
          </div>
        </section>

        {/* Active conditions */}
        <ChipEditor
          title="Active conditions"
          icon={<Stethoscope className="h-4 w-4" />}
          items={profile.active_conditions}
          suggestions={COMMON_CONDITIONS}
          onToggle={(s) => toggleItem("active_conditions", s)}
          onAdd={(v) => addCustom("active_conditions", v)}
          placeholder="Add condition (e.g. Hypertension)"
        />

        {/* Active medications */}
        <ChipEditor
          title="Active medications"
          icon={<Pill className="h-4 w-4" />}
          items={profile.active_medications}
          suggestions={COMMON_MEDICATIONS}
          onToggle={(s) => toggleItem("active_medications", s)}
          onAdd={(v) => addCustom("active_medications", v)}
          placeholder="Add medication (e.g. Amlodipine 5mg)"
        />

        {/* Vitals history */}
        <VitalsHistory vitals={vitals} onDelete={removeVital} />

        {/* Security & Privacy */}
        <section className="rounded-xl border-2 border-danger bg-danger/5 p-5 shadow-brutal space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-danger" />
            <h2 className="font-display text-lg uppercase text-danger">Security & Privacy</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Permanently remove all your medication history, vitals readings and account details
            from our database. This cannot be undone.
          </p>
          <Button
            onClick={() => setConfirmOpen(true)}
            className="w-full border-2 border-foreground bg-danger font-display uppercase text-danger-foreground shadow-brutal-sm brutal-press hover:bg-danger/90"
          >
            <Trash2 className="h-4 w-4" /> Request Data Deletion
          </Button>
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full border-2 border-foreground font-display uppercase shadow-brutal-sm brutal-press"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </section>
      </main>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="border-2 border-foreground shadow-brutal-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl uppercase">
              Delete your account?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              This will <strong>permanently remove</strong> all your medication history, vitals
              readings, dose logs and profile details. This action <strong>cannot be undone</strong>.
              You will be signed out immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="border-2 border-foreground">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="border-2 border-foreground bg-danger font-display uppercase text-danger-foreground shadow-brutal-sm hover:bg-danger/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Yes, delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function ChipEditor({
  title,
  icon,
  items,
  suggestions,
  onToggle,
  onAdd,
  placeholder,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  suggestions: string[];
  onToggle: (s: string) => void;
  onAdd: (s: string) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  const remaining = useMemo(
    () => suggestions.filter((s) => !items.some((i) => i.toLowerCase() === s.toLowerCase())),
    [items, suggestions],
  );
  return (
    <section className="rounded-xl border-2 border-foreground bg-card p-5 shadow-brutal space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="font-display text-lg uppercase">{title}</h2>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">None added yet.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full border-2 border-foreground bg-primary px-2.5 py-1 font-mono-tech text-[11px] uppercase text-primary-foreground shadow-brutal-sm"
            >
              {i}
              <button
                onClick={() => onToggle(i)}
                aria-label={`Remove ${i}`}
                className="ml-0.5 rounded-full p-0.5 hover:bg-primary-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onAdd(draft);
          setDraft("");
        }}
        className="flex gap-2"
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          className="border-2 border-foreground"
        />
        <Button
          type="submit"
          disabled={!draft.trim()}
          className="border-2 border-foreground bg-primary font-display uppercase text-primary-foreground shadow-brutal-sm brutal-press"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </form>

      {remaining.length > 0 && (
        <div>
          <p className="mb-1.5 font-mono-tech text-[10px] uppercase text-muted-foreground">
            Quick add
          </p>
          <div className="flex flex-wrap gap-1.5">
            {remaining.slice(0, 8).map((s) => (
              <button
                key={s}
                onClick={() => onToggle(s)}
                className="rounded-full border-2 border-foreground bg-background px-2.5 py-1 font-mono-tech text-[11px] uppercase shadow-brutal-sm brutal-press hover:bg-muted"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function VitalsHistory({
  vitals,
  onDelete,
}: {
  vitals: VitalsLog[];
  onDelete: (id: string) => void;
}) {
  return (
    <section className="rounded-xl border-2 border-foreground bg-card p-5 shadow-brutal space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg uppercase">Vitals history</h2>
      </div>

      {vitals.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-foreground/40 bg-muted p-4 text-center text-sm">
          <Heart className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-1 font-display uppercase">No readings yet</p>
          <p className="text-xs text-muted-foreground">
            Tap the <strong>Vitals</strong> button on the home screen to record your first
            pulse + BP estimate.
          </p>
        </div>
      ) : (
        <ol className="space-y-2">
          {vitals.map((v) => {
            const cat = bpCategory(v.systolic, v.diastolic);
            const toneClass =
              cat.tone === "danger"
                ? "bg-danger text-danger-foreground"
                : cat.tone === "caution"
                  ? "bg-caution text-caution-foreground"
                  : cat.tone === "safe"
                    ? "bg-safe text-safe-foreground"
                    : "bg-muted text-foreground";
            return (
              <li
                key={v.id}
                className="flex items-center gap-3 rounded-lg border-2 border-foreground bg-background p-3 shadow-brutal-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border-2 border-foreground bg-primary text-primary-foreground">
                  <Heart className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm leading-tight">
                    {v.pulse_bpm ?? "—"} bpm · BP {v.systolic ?? "—"}/{v.diastolic ?? "—"}
                  </p>
                  <p className="font-mono-tech text-[10px] uppercase text-muted-foreground">
                    {new Date(v.measured_at).toLocaleString(undefined, {
                      month: "short",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {v.source ?? "camera"}
                  </p>
                </div>
                <Badge className={`border-2 border-foreground font-mono-tech uppercase ${toneClass}`}>
                  {cat.label}
                </Badge>
                <button
                  onClick={() => onDelete(v.id)}
                  aria-label="Delete reading"
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Try again.";
}

export default Profile;
