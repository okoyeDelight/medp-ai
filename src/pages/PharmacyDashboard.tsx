import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  type Pharmacy,
  type PharmacyChatSession,
  acceptChatSession,
  declineChatSession,
  fetchMyPharmacy,
  setDutyStatus,
  upsertMyPharmacy,
} from "@/lib/telepharmacy";
import { useAuthSession } from "@/hooks/use-auth-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PhoneCall, ShieldCheck, X, Check } from "lucide-react";
import { SecureChatPanel } from "@/components/telepharmacy/SecureChatPanel";
import { toast } from "sonner";
import "@/styles/clinical.css";

export default function PharmacyDashboard() {
  const { session, loading: authLoading } = useAuthSession();
  const [pharm, setPharm] = useState<Pharmacy | null>(null);
  const [sessions, setSessions] = useState<PharmacyChatSession[]>([]);
  const [active, setActive] = useState<PharmacyChatSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Onboarding form
  const [name, setName] = useState("");
  const [license, setLicense] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  const meId = session?.user.id ?? null;

  useEffect(() => {
    if (!meId) return;
    (async () => {
      const p = await fetchMyPharmacy(meId);
      setPharm(p);
      setLoading(false);
    })();
  }, [meId]);

  // Load pending + active sessions for this pharmacist
  useEffect(() => {
    if (!meId) return;
    const load = async () => {
      const { data } = await supabase
        .from("pharmacy_chat_sessions" as any)
        .select("*")
        .eq("pharmacist_user_id", meId)
        .in("status", ["pending", "active"])
        .order("started_at", { ascending: false });
      setSessions((data as unknown as PharmacyChatSession[]) ?? []);
    };
    load();
    const ch = supabase
      .channel("pharm-inbox")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pharmacy_chat_sessions", filter: `pharmacist_user_id=eq.${meId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [meId]);

  if (authLoading || loading) {
    return (
      <div className="theme-clinical flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!session) return <Navigate to="/auth" replace />;

  // ── Onboarding: register pharmacy ───────────────────────────────────────────
  if (!pharm) {
    return (
      <div className="theme-clinical min-h-screen bg-background">
        <main className="container max-w-md py-8">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Register Your Pharmacy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Your pharmacy will only become visible to patients once it is verified and you toggle "On Duty".
              </p>
              <div className="space-y-1.5">
                <Label>Pharmacy name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="HealthPlus Yaba" />
              </div>
              <div className="space-y-1.5">
                <Label>PCN License #</Label>
                <Input value={license} onChange={(e) => setLicense(e.target.value)} placeholder="PCN-12345" />
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Herbert Macaulay Way" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234…" />
              </div>
              <Button
                className="w-full"
                disabled={saving || !name || !license}
                onClick={async () => {
                  setSaving(true);
                  try {
                    // Best-effort GPS
                    let coords: { lat?: number; lng?: number } = {};
                    await new Promise<void>((r) => {
                      if (!navigator.geolocation) return r();
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                          r();
                        },
                        () => r(),
                        { timeout: 4000 },
                      );
                    });
                    const created = await upsertMyPharmacy({
                      owner_user_id: meId!,
                      name,
                      license_number: license,
                      address,
                      phone,
                      is_licensed_pharmacy: true, // demo auto-verify; real flow requires admin review
                      duty_status: "offline",
                      ...coords,
                    });
                    setPharm(created);
                    toast.success("Pharmacy registered. Toggle 'On Duty' to start receiving patients.");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed");
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Register
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Active chat view
  if (active && meId) {
    return (
      <div className="theme-clinical min-h-screen bg-background">
        <main className="container max-w-2xl py-4">
          <div className="h-[calc(100vh-100px)]">
            <SecureChatPanel
              session={active}
              meId={meId}
              role="pharmacist"
              counterpartyName="Patient"
              onClosed={() => setActive(null)}
            />
          </div>
        </main>
      </div>
    );
  }

  const pending = sessions.filter((s) => s.status === "pending");
  const live = sessions.filter((s) => s.status === "active");

  return (
    <div className="theme-clinical min-h-screen bg-background">
      <main className="container max-w-2xl space-y-4 py-6">
        {/* Duty toggle header */}
        <Card className="border-2">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span className="font-display text-base">{pharm.name}</span>
                <Badge variant={pharm.duty_status === "online" ? "default" : "secondary"}>
                  {pharm.duty_status === "online" ? "On Duty" : "Off Duty"}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {pharm.duty_status === "online"
                  ? "Visible to patients near you."
                  : "Hidden from patient discovery."}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="duty" className="text-xs">Duty</Label>
              <Switch
                id="duty"
                checked={pharm.duty_status === "online"}
                onCheckedChange={async (v) => {
                  const next = v ? "online" : "offline";
                  try {
                    await setDutyStatus(pharm.id, next);
                    setPharm({ ...pharm, duty_status: next });
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed");
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Incoming queue */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">
              Incoming Requests
              {pending.length > 0 && (
                <Badge className="ml-2 animate-pulse bg-red-600 text-white">
                  <PhoneCall className="mr-1 h-3 w-3" /> {pending.length} ringing
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pending.length === 0 ? (
              <p className="text-xs text-muted-foreground">No requests waiting.</p>
            ) : (
              <ul className="space-y-2">
                {pending.map((s) => (
                  <li key={s.id} className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                    <div>
                      <div className="text-sm font-medium">
                        {s.interaction_report?.patient_label ?? "Patient"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Started {new Date(s.started_at).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await declineChatSession(s.id);
                        }}
                      >
                        <X className="mr-1 h-3.5 w-3.5" /> Decline
                      </Button>
                      <Button
                        size="sm"
                        onClick={async () => {
                          await acceptChatSession(s.id);
                          setActive({ ...s, status: "active" });
                        }}
                      >
                        <Check className="mr-1 h-3.5 w-3.5" /> Accept Patient
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Active consultations */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Active Consultations</CardTitle>
          </CardHeader>
          <CardContent>
            {live.length === 0 ? (
              <p className="text-xs text-muted-foreground">No live consultations.</p>
            ) : (
              <ul className="space-y-2">
                {live.map((s) => (
                  <li key={s.id} className="flex items-center justify-between rounded-lg border bg-emerald-50 p-3 dark:bg-emerald-950/30">
                    <div>
                      <div className="text-sm font-medium">{s.interaction_report?.patient_label ?? "Patient"}</div>
                      <div className="text-[11px] text-muted-foreground">
                        Accepted {s.accepted_at ? new Date(s.accepted_at).toLocaleTimeString() : "—"}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => setActive(s)}>
                      Open chat
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
