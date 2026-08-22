import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Building2, HeartHandshake, Leaf, Pill, Stethoscope, User, Users, Activity, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const INTRO_SEEN_KEY = "medp.introSeen";
const PERSONA_KEY = "medp.introPersona";

type Step = "splash" | "welcome" | "value" | "persona";
const FLOW: Step[] = ["welcome", "value", "persona"];

const PERSONAS = [
  { id: "self", label: "I'm looking after myself", icon: User },
  { id: "caregiver", label: "I'm caring for someone", icon: Users },
  { id: "manage", label: "I want to manage my health", icon: Activity },
  { id: "urgent", label: "I need medical help", icon: HeartHandshake },
];

const ORBIT = [
  { label: "Traditional Care", icon: Leaf },
  { label: "Doctor", icon: Stethoscope },
  { label: "Pharmacy", icon: Pill },
  { label: "Hospital", icon: Building2 },
  { label: "MedP-AI", icon: Sparkles },
];

export default function Welcome() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("splash");
  const [persona, setPersona] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setStep("welcome"), 1300);
    return () => window.clearTimeout(t);
  }, []);

  function finish() {
    localStorage.setItem(INTRO_SEEN_KEY, "1");
    if (persona) localStorage.setItem(PERSONA_KEY, persona);
    navigate("/auth", { replace: true });
  }

  function back() {
    const i = FLOW.indexOf(step as Step);
    if (i > 0) setStep(FLOW[i - 1]);
  }

  const flowIndex = FLOW.indexOf(step as Step);

  if (step === "splash") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-5 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-700">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-[1.75rem] bg-primary text-primary-foreground shadow-[var(--shadow-elev)]">
            <span className="absolute inset-0 rounded-[1.75rem] border border-primary/30 motion-safe:animate-ping motion-reduce:hidden" />
            <span className="font-display text-3xl tracking-tight">M</span>
          </div>
          <div className="text-center">
            <p className="font-display text-2xl tracking-tight">MedP-AI</p>
            <p className="mt-1 font-mono-tech text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Your health. Connected.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar: back + progress */}
      <header className="flex items-center justify-between px-5 pt-6">
        {flowIndex > 0 ? (
          <button
            onClick={back}
            aria-label="Go back"
            className="flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : (
          <span className="h-11 w-11" />
        )}
        <div className="flex items-center gap-1.5" aria-label={`Step ${flowIndex + 1} of ${FLOW.length}`}>
          {FLOW.map((s, i) => (
            <span
              key={s}
              className={`h-1.5 rounded-full transition-all ${i <= flowIndex ? "w-6 bg-primary" : "w-1.5 bg-border"}`}
            />
          ))}
        </div>
        <span className="h-11 w-11" />
      </header>

      <main
        key={step}
        className="flex flex-1 flex-col px-6 pb-10 pt-8 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500"
      >
        {step === "welcome" && (
          <div className="flex flex-1 flex-col">
            <div className="flex flex-1 flex-col justify-center gap-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
                <span className="font-display text-2xl">M</span>
              </div>
              <div className="space-y-3">
                <h1 className="font-display text-[2.15rem] leading-[1.1] tracking-tight">
                  Welcome to<br />MedP-AI
                </h1>
                <p className="text-lg text-muted-foreground">Your health. Connected.</p>
              </div>
            </div>
            <div className="space-y-3">
              <Button
                size="lg"
                className="h-14 w-full rounded-xl text-base font-semibold shadow-[var(--shadow-soft)]"
                onClick={() => setStep("value")}
              >
                Get started
              </Button>
              <button
                onClick={() => {
                  localStorage.setItem(INTRO_SEEN_KEY, "1");
                  navigate("/auth");
                }}
                className="w-full py-3 text-sm text-muted-foreground"
              >
                Already have an account? <span className="font-semibold text-primary">Sign in</span>
              </button>
            </div>
          </div>
        )}

        {step === "value" && (
          <div className="flex flex-1 flex-col">
            <div className="flex flex-1 flex-col justify-center gap-9">
              {/* Connected journey visual */}
              <div className="relative mx-auto flex h-[248px] w-full max-w-[320px] items-center justify-center">
                <div className="absolute h-[210px] w-[210px] rounded-full border border-border" />
                <div className="absolute h-[150px] w-[150px] rounded-full border border-border" />
                <div className="relative z-10 flex h-24 w-24 flex-col items-center justify-center rounded-full bg-primary text-center text-primary-foreground shadow-[var(--shadow-elev)]">
                  <span className="font-display text-sm leading-tight">Your<br />Health</span>
                </div>
                {ORBIT.map((o, i) => {
                  const angle = (i / ORBIT.length) * 2 * Math.PI - Math.PI / 2;
                  const r = 105;
                  return (
                    <div
                      key={o.label}
                      className="absolute flex flex-col items-center gap-1"
                      style={{
                        transform: `translate(${Math.cos(angle) * r}px, ${Math.sin(angle) * r}px)`,
                      }}
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-primary shadow-[var(--shadow-ring)]">
                        <o.icon className="h-5 w-5" />
                      </div>
                      <span className="whitespace-nowrap font-mono-tech text-[9px] uppercase tracking-wider text-muted-foreground">
                        {o.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="space-y-3">
                <h1 className="font-display text-[1.9rem] leading-[1.15] tracking-tight">
                  One place for your health journey.
                </h1>
                <p className="text-base leading-relaxed text-muted-foreground">
                  MedP-AI helps connect the different parts of your care, so you don't have to figure
                  everything out yourself.
                </p>
              </div>
            </div>
            <Button
              size="lg"
              className="h-14 w-full rounded-xl text-base font-semibold shadow-[var(--shadow-soft)]"
              onClick={() => setStep("persona")}
            >
              Continue <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}

        {step === "persona" && (
          <div className="flex flex-1 flex-col">
            <div className="space-y-2">
              <h1 className="font-display text-[1.9rem] leading-[1.15] tracking-tight">
                What brings you to MedP-AI?
              </h1>
              <p className="text-sm text-muted-foreground">Pick one — you can change this later.</p>
            </div>
            <div className="mt-7 flex-1 space-y-3">
              {PERSONAS.map((p) => {
                const active = persona === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPersona(p.id)}
                    aria-pressed={active}
                    className={`flex w-full items-center gap-4 rounded-2xl border px-5 py-5 text-left transition-all ${
                      active
                        ? "border-primary bg-secondary shadow-[var(--shadow-soft)]"
                        : "border-border bg-card hover:bg-secondary/60"
                    }`}
                  >
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                        active ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"
                      }`}
                    >
                      <p.icon className="h-5 w-5" />
                    </span>
                    <span className="text-base font-semibold leading-snug">{p.label}</span>
                  </button>
                );
              })}
            </div>
            <Button
              size="lg"
              disabled={!persona}
              className="mt-6 h-14 w-full rounded-xl text-base font-semibold shadow-[var(--shadow-soft)]"
              onClick={finish}
            >
              Create my account <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
