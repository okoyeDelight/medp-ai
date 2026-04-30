import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AppHeader } from "@/components/AppHeader";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const signUpSchema = z.object({
  displayName: z.string().trim().min(2, "Min 2 characters").max(60),
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "Min 8 characters").max(128),
});
const signInSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(1, "Required").max(128),
});

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  // Redirect if already signed in
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/", { replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) navigate("/", { replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const parsed = signUpSchema.safeParse({ displayName, email, password });
        if (!parsed.success) {
          toast({ title: "Check your details", description: parsed.error.issues[0].message, variant: "destructive" });
          return;
        }
        if (!agreed) {
          toast({ title: "Agreement required", description: "Please accept the Privacy Policy and Terms.", variant: "destructive" });
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: parsed.data.displayName },
          },
        });
        if (error) throw error;
        toast({ title: "Welcome 🎉", description: "Account created. You're signed in." });
      } else {
        const parsed = signInSchema.safeParse({ email, password });
        if (!parsed.success) {
          toast({ title: "Check your details", description: parsed.error.issues[0].message, variant: "destructive" });
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: mode === "signup" ? "Sign-up failed" : "Sign-in failed", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    if (mode === "signup" && !agreed) {
      toast({ title: "Agreement required", description: "Please accept the Privacy Policy and Terms first.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/` });
    } catch (err) {
      toast({ title: "Google sign-in failed", description: err instanceof Error ? err.message : "Try again.", variant: "destructive" });
      setBusy(false);
    }
  }

  const canSubmit = mode === "signin" || (agreed && !busy);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-md py-8">
        <div className="rounded-xl border-2 border-foreground bg-card p-6 shadow-brutal">
          <div className="mb-5 flex gap-2">
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-lg border-2 border-foreground py-2 font-display text-sm uppercase ${
                mode === "signup" ? "bg-primary text-primary-foreground shadow-brutal-sm" : "bg-card"
              }`}
            >
              Sign Up
            </button>
            <button
              onClick={() => setMode("signin")}
              className={`flex-1 rounded-lg border-2 border-foreground py-2 font-display text-sm uppercase ${
                mode === "signin" ? "bg-primary text-primary-foreground shadow-brutal-sm" : "bg-card"
              }`}
            >
              Sign In
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="displayName">Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="border-2 border-foreground"
                  required
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="border-2 border-foreground"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "Min 8 characters" : "Your password"}
                className="border-2 border-foreground"
                required
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>

            {mode === "signup" && (
              <div className="flex items-start gap-2.5 rounded-lg border-2 border-foreground bg-muted p-3">
                <Checkbox
                  id="agree"
                  checked={agreed}
                  onCheckedChange={(v) => setAgreed(v === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="agree" className="cursor-pointer text-xs leading-snug">
                  I have read and agree to the{" "}
                  <Link to="/privacy-policy" className="font-semibold text-primary underline">
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link to="/terms-of-service" className="font-semibold text-primary underline">
                    Terms of Service
                  </Link>
                  .
                </Label>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={!canSubmit}
              className="w-full border-2 border-foreground bg-primary font-display text-base uppercase text-primary-foreground shadow-brutal-sm brutal-press hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signup" ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="font-mono-tech text-[10px] uppercase text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={busy || (mode === "signup" && !agreed)}
            onClick={handleGoogle}
            className="w-full border-2 border-foreground font-display text-sm uppercase shadow-brutal-sm brutal-press"
          >
            Continue with Google
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Auth;
