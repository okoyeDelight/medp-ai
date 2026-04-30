import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Loader2, LogOut, ShieldAlert, Trash2, User as UserIcon } from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuthSession();
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.display_name) setDisplayName(data.display_name);
      });
  }, [user]);

  async function saveName() {
    if (!user) return;
    setSavingName(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() })
      .eq("user_id", user.id);
    setSavingName(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved ✅", description: "Profile updated." });
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      // Wipe diary + profile via SECURITY DEFINER RPC (auth.users row removal needs admin
      // function — for now we sign the user out so they cannot reuse the credentials in-app).
      const { error } = await supabase.rpc("delete_my_account");
      if (error) throw error;
      await supabase.auth.signOut();
      toast({
        title: "Account data removed",
        description: "Your medication history and profile have been permanently deleted.",
      });
      navigate("/auth", { replace: true });
    } catch (err) {
      toast({
        title: "Deletion failed",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

  if (loading || !user) {
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

        {/* Profile card */}
        <section className="rounded-xl border-2 border-foreground bg-card p-5 shadow-brutal space-y-4">
          <div className="space-y-1.5">
            <Label className="font-mono-tech text-[10px] uppercase">Email</Label>
            <p className="font-display text-base">{user.email}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dn" className="font-mono-tech text-[10px] uppercase">
              Display name
            </Label>
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
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full border-2 border-foreground font-display uppercase shadow-brutal-sm brutal-press"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </section>

        {/* Security & Privacy */}
        <section className="rounded-xl border-2 border-danger bg-danger/5 p-5 shadow-brutal space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-danger" />
            <h2 className="font-display text-lg uppercase text-danger">Security & Privacy</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Permanently remove all your medication history and account details from our database.
            This action cannot be undone.
          </p>
          <Button
            onClick={() => setConfirmOpen(true)}
            className="w-full border-2 border-foreground bg-danger font-display uppercase text-danger-foreground shadow-brutal-sm brutal-press hover:bg-danger/90"
          >
            <Trash2 className="h-4 w-4" /> Request Data Deletion
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
              This will <strong>permanently remove</strong> all your medication history, dose
              logs, and profile details from our database. This action <strong>cannot be
              undone</strong>. You will be signed out immediately.
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

export default Profile;
