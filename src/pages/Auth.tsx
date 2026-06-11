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
import { Loader2, ShieldCheck } from "lucide-react";

const FOUNDER_EMAIL = "chinedubisiola04@gmail.com";

const signUpSchema = z.object({
  displayName: z.string().trim().min(2, "Min 2 characters").max(60),
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "Min 8 characters").max(128),
});
const hcpSchema = signUpSchema.extend({
  licenseNumber: z.string().trim().min(4, "License # required").max(60),
});
const signInSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(1, "Required").max(128),
});


const REMEMBER_KEY = "medp.rememberMe";

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [role, setRole] = useState<"patient" | "hcp">("patient");
  const [displayName, setDisplayName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);


  useEffect(() => {
    const route = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const userEmail = data.session.user.email?.toLowerCase();
      // Founder bypass: server-side trigger has already seeded provider role
      // after email confirmation. Route them straight to the clinical desk.
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("role", "provider");
      if (roles?.length) {
        navigate("/hospital-dashboard", { replace: true });
      } else if (userEmail === FOUNDER_EMAIL) {
        // Founder is logged in but email not yet verified → pending
        navigate("/provider/pending", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    };
    route();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) route();
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);



  function persistRememberPreference() {
    // We always store the session in localStorage (Supabase client default).
    // The "remember me" toggle controls whether we KEEP that session on next launch.
    // If unchecked, RequireAuth will sign the user out on initial load when the flag is missing.
    if (remember) {
      localStorage.setItem(REMEMBER_KEY, "1");
    } else {
      localStorage.removeItem(REMEMBER_KEY);
      // Mark as "session only" so the next cold-start clears it
      sessionStorage.setItem("medp.sessionOnly", "1");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      // Privacy gate is mandatory in BOTH modes now
      if (!agreed) {
        toast({
          title: "Agreement required",
          description: "Please tick the box confirming you've read the Privacy Policy and Terms.",
          variant: "destructive",
        });
        return;
      }
      if (mode === "signup") {
        const parsed = signUpSchema.safeParse({ displayName, email, password });
        if (!parsed.success) {
          toast({ title: "Check your details", description: parsed.error.issues[0].message, variant: "destructive" });
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
        persistRememberPreference();
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
        persistRememberPreference();
      }
    } catch (err) {
      toast({
        title: mode === "signup" ? "Sign-up failed" : "Sign-in failed",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    if (!agreed) {
      toast({
        title: "Agreement required",
        description: "Please accept the Privacy Policy and Terms first.",
        variant: "destructive",
      });
      return;
    }
    persistRememberPreference();
    setBusy(true);
    try {
      await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/` });
    } catch (err) {
      toast({
        title: "Google sign-in failed",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
      setBusy(false);
    }
  }

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

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="displayName">Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="border-2 border-foreground"
                  autoComplete="name"
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
                autoComplete={mode === "signup" ? "email" : "username"}
                required
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
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
              />
            </div>

            {/* Remember-me — saves password & auto-opens app */}
            <div className="flex items-center justify-between rounded-lg border-2 border-foreground bg-muted p-3">
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(v) => setRemember(v === true)}
                />
                <Label htmlFor="remember" className="cursor-pointer text-sm">
                  Remember me on this device
                </Label>
              </div>
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>

            {/* Mandatory privacy gate — required for BOTH modes */}
            <div className="flex items-start gap-2.5 rounded-lg border-2 border-foreground bg-accent/50 p-3">
              <Checkbox
                id="agree"
                checked={agreed}
                onCheckedChange={(v) => setAgreed(v === true)}
                className="mt-0.5"
                required
              />
              <Label htmlFor="agree" className="cursor-pointer text-xs leading-snug">
                <strong>Required:</strong> I have read and agree to the{" "}
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

            <Button
              type="submit"
              size="lg"
              disabled={busy || !agreed}
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
            disabled={busy || !agreed}
            onClick={handleGoogle}
            className="w-full border-2 border-foreground font-display text-sm uppercase shadow-brutal-sm brutal-press"
          >
            Continue with Google
          </Button>

          <p className="mt-3 text-center font-mono-tech text-[10px] uppercase text-muted-foreground">
            Your browser may offer to save your password securely on this device.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Auth;
