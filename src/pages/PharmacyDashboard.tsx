import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  type Pharmacy,
  type PharmacyChatSession,
  acceptChatSession,
  declineChatSession,
  fetchMyPharmacy,
  fetchSessionHistory,
  isWithinDutyHours,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  PhoneCall,
  ShieldCheck,
  X,
  Check,
  MapPin,
  History,
  Inbox as InboxIcon,
  Settings as SettingsIcon,
  Clock,
  Save,
} from "lucide-react";
import { SecureChatPanel } from "@/components/telepharmacy/SecureChatPanel";
import { toast } from "sonner";
import "@/styles/clinical.css";

/** Single short beep using WebAudio — no asset required. */
function useRingTone(active: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      try {
        const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
        if (!ctxRef.current) ctxRef.current = new Ctx();
        const ctx = ctxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 880;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.27);
      } catch {
        /* autoplay blocked until user interacts */
      }
    }, 1800);
    return () => clearInterval(id);
  }, [active]);
}

function fmtElapsed(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

export default function PharmacyDashboard() {
  const { session, loading: authLoading } = useAuthSession();
  const [pharm, setPharm] = useState<Pharmacy | null>(null);
  const [sessions, setSessions] = useState<PharmacyChatSession[]>([]);
  const [history, setHistory] = useState<PharmacyChatSession[]>([]);
  const [active, setActive] = useState<PharmacyChatSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [historyQuery, setHistoryQuery] = useState("");
  const [, setTick] = useState(0); // for live elapsed timers

  // Onboarding form
  const [name, setName] = useState("");
  const [license, setLicense] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  const meId = session?.user.id ?? null;

  // Tick every second for wait timers
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!meId) return;
    (async () => {
      const p = await fetchMyPharmacy(meId);
      setPharm(p);
      setLoading(false);
    })();
  }, [meId]);

  // Load pending + active sessions for this pharmacist (realtime)
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

  // Load history when user opens the History tab (and on mount for stats)
  useEffect(() => {
    if (!meId) return;
    fetchSessionHistory(meId).then(setHistory);
  }, [meId]);

  // Auto-duty toggling based on hours
  useEffect(() => {
    if (!pharm?.auto_duty) return;
    const want = isWithinDutyHours(pharm) ? "online" : "offline";
    if (want !== pharm.duty_status) {
      setDutyStatus(pharm.id, want).then(() => setPharm({ ...pharm, duty_status: want }));
    }
  }, [pharm?.auto_duty, pharm?.hours_open, pharm?.hours_close]);

  const pending = useMemo(() => sessions.filter((s) => s.status === "pending"), [sessions]);
  const live = useMemo(() => sessions.filter((s) => s.status === "active"), [sessions]);
  useRingTone(pending.length > 0 && !active);

  // ── Loading / unauth ───────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <div className="theme-clinical flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!session) return <Navigate to="/auth" replace />;

  // ── Onboarding ─────────────────────────────────────────────────
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
                Your pharmacy will only become visible to patients once verified and you toggle "On Duty".
              </p>
              <div className="space-y-1.5">
                <Label>Pharmacy name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="HealthPlus Yaba" />
              </div>
              <div className="space-y-1.5">
                <Label>PCN License # (format: PCN-XXXXX)</Label>
                <Input value={license} onChange={(e) => setLicense(e.target.value)} placeholder="PCN-12345" />
                {license && !/^PCN-\d{4,8}$/i.test(license.trim()) && (
                  <p className="text-[11px] text-amber-600">License should look like PCN-12345.</p>
                )}
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
                disabled={saving || !name || !/^PCN-\d{4,8}$/i.test(license.trim())}
                onClick={async () => {
                  setSaving(true);
                  try {
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
                      is_licensed_pharmacy: true,
                      duty_status: "offline",
                      ...coords,
                    });
                    setPharm(created);
                    toast.success("Pharmacy registered. Configure Settings and toggle 'On Duty'.");
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

  // ── Active chat ────────────────────────────────────────────────
  if (active && meId) {
    return (
      <div className="theme-clinical min-h-screen bg-background">
        <main className="container max-w-2xl py-4">
          <div className="h-[calc(100vh-100px)]">
            <SecureChatPanel
              session={active}
              meId={meId}
              role="pharmacist"
              counterpartyName={active.interaction_report?.patient_label ?? "Patient"}
              onClosed={() => {
                setActive(null);
                fetchSessionHistory(meId).then(setHistory);
              }}
              quickReplies={pharm.quick_replies}
            />
          </div>
        </main>
      </div>
    );
  }

  const today = new Date().toDateString();
  const todayCount = history.filter((s) => s.ended_at && new Date(s.ended_at).toDateString() === today).length;
  const avgMin =
    history.length === 0
      ? 0
      : Math.round(
          history
            .filter((s) => s.accepted_at && s.ended_at)
            .reduce((acc, s) => acc + (new Date(s.ended_at!).getTime() - new Date(s.accepted_at!).getTime()), 0) /
            (Math.max(1, history.filter((s) => s.accepted_at && s.ended_at).length) * 60_000),
        );
  const filteredHistory = history.filter((s) => {
    if (!historyQuery) return true;
    const hay = `${s.interaction_report?.patient_label ?? ""} ${s.id} ${s.ended_at ?? ""}`.toLowerCase();
    return hay.includes(historyQuery.toLowerCase());
  });

  return (
    <div className="theme-clinical min-h-screen bg-background">
      <main className="container max-w-3xl space-y-4 py-6">
        {/* Status header */}
        <Card className="border-2">
          <CardContent className="flex items-center justify-between py-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span className="font-display text-base truncate">{pharm.name}</span>
                <Badge variant={pharm.duty_status === "online" ? "default" : "secondary"}>
                  {pharm.duty_status === "online" ? "On Duty" : "Off Duty"}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {pharm.pricing_mode === "paid" ? `₦${pharm.price_naira}/consult` : "Free"}
                </Badge>
                {pharm.auto_duty && (
                  <Badge variant="outline" className="text-[10px]"><Clock className="mr-1 h-3 w-3" />Auto</Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {pharm.duty_status === "online"
                  ? `Visible within ${pharm.service_radius_km} km of your pin.`
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

        <Tabs defaultValue="inbox">
          <TabsList className="w-full">
            <TabsTrigger value="inbox" className="flex-1">
              <InboxIcon className="mr-1.5 h-3.5 w-3.5" /> Inbox
              {pending.length > 0 && <Badge className="ml-2 h-4 px-1.5 text-[10px]">{pending.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1">
              <History className="mr-1.5 h-3.5 w-3.5" /> History
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-1">
              <SettingsIcon className="mr-1.5 h-3.5 w-3.5" /> Settings
            </TabsTrigger>
          </TabsList>

          {/* ── INBOX ─────────────────────────────────────────── */}
          <TabsContent value="inbox" className="space-y-4">
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
                    {pending.map((s) => {
                      const waited = Math.floor((Date.now() - new Date(s.started_at).getTime()) / 1000);
                      const stale = waited > 60;
                      return (
                        <li
                          key={s.id}
                          className={`flex items-center justify-between rounded-lg border p-3 ${
                            stale ? "border-red-500 bg-red-50 dark:bg-red-950/30" : "border-amber-400 bg-amber-50 dark:bg-amber-950/30"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">
                              {s.interaction_report?.patient_label ?? "Patient"}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Waiting {fmtElapsed(s.started_at)}
                              {stale && <span className="ml-1 font-semibold text-red-600">· urgent</span>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => declineChatSession(s.id)}>
                              <X className="mr-1 h-3.5 w-3.5" /> Decline
                            </Button>
                            <Button
                              size="sm"
                              onClick={async () => {
                                await acceptChatSession(s.id);
                                setActive({ ...s, status: "active", accepted_at: new Date().toISOString() });
                              }}
                            >
                              <Check className="mr-1 h-3.5 w-3.5" /> Accept
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

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
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {s.interaction_report?.patient_label ?? "Patient"}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Active for {s.accepted_at ? fmtElapsed(s.accepted_at) : "—"}
                          </div>
                        </div>
                        <Button size="sm" onClick={() => setActive(s)}>Open chat</Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── HISTORY ───────────────────────────────────────── */}
          <TabsContent value="history" className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <Card><CardContent className="p-3 text-center">
                <div className="text-2xl font-display">{todayCount}</div>
                <div className="text-[10px] uppercase text-muted-foreground">Today</div>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <div className="text-2xl font-display">{history.length}</div>
                <div className="text-[10px] uppercase text-muted-foreground">Total</div>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <div className="text-2xl font-display">{avgMin}m</div>
                <div className="text-[10px] uppercase text-muted-foreground">Avg length</div>
              </CardContent></Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-base">Past Consultations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Search patient or date…"
                  value={historyQuery}
                  onChange={(e) => setHistoryQuery(e.target.value)}
                />
                {filteredHistory.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">No past sessions yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {filteredHistory.map((s) => (
                      <li key={s.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">
                              {s.interaction_report?.patient_label ?? "Patient"}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {s.ended_at ? new Date(s.ended_at).toLocaleString() : "—"} · {s.status}
                            </div>
                          </div>
                          <Badge variant={s.status === "ended" ? "default" : "secondary"}>{s.status}</Badge>
                        </div>
                        {(s as any).archived_transcript && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-[11px] text-primary">View transcript</summary>
                            <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 font-mono text-[10px]">
                              {((s as any).archived_transcript as any[])
                                .map((m: any) => `[${m.sender_role}] ${m.body}`)
                                .join("\n\n")}
                            </pre>
                          </details>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── SETTINGS ──────────────────────────────────────── */}
          <TabsContent value="settings">
            <SettingsForm pharm={pharm} onSaved={setPharm} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function SettingsForm({ pharm, onSaved }: { pharm: Pharmacy; onSaved: (p: Pharmacy) => void }) {
  const [radius, setRadius] = useState<number>(pharm.service_radius_km);
  const [open, setOpen] = useState<string>(pharm.hours_open ?? "08:00");
  const [close, setClose] = useState<string>(pharm.hours_close ?? "20:00");
  const [autoDuty, setAutoDuty] = useState(pharm.auto_duty);
  const [pricing, setPricing] = useState<"free" | "paid">(pharm.pricing_mode);
  const [price, setPrice] = useState<number>(pharm.price_naira);
  const [replies, setReplies] = useState<string>(pharm.quick_replies.join("\n"));
  const [busy, setBusy] = useState(false);

  async function pinLocation() {
    if (!navigator.geolocation) return toast.error("Location unavailable");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { error, data } = await supabase
          .from("pharmacies" as any)
          .update({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          .eq("id", pharm.id)
          .select()
          .single();
        if (error) return toast.error(error.message);
        onSaved(data as unknown as Pharmacy);
        toast.success("Location updated.");
      },
      () => toast.error("Permission denied"),
      { timeout: 6000 },
    );
  }

  async function save() {
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("pharmacies" as any)
        .update({
          service_radius_km: radius,
          hours_open: open,
          hours_close: close,
          auto_duty: autoDuty,
          pricing_mode: pricing,
          price_naira: pricing === "paid" ? price : 0,
          quick_replies: replies.split("\n").map((s) => s.trim()).filter(Boolean),
        })
        .eq("id", pharm.id)
        .select()
        .single();
      if (error) throw error;
      onSaved(data as unknown as Pharmacy);
      toast.success("Settings saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="font-display text-base">Discoverability & Pricing</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        {/* Location */}
        <div className="space-y-1.5">
          <Label>Pharmacy pin</Label>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={pharm.lat && pharm.lng ? `${pharm.lat.toFixed(4)}, ${pharm.lng.toFixed(4)}` : "not set"}
            />
            <Button type="button" variant="outline" onClick={pinLocation}>
              <MapPin className="mr-1 h-3.5 w-3.5" /> Use current
            </Button>
          </div>
        </div>

        {/* Service radius */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>Service radius</Label>
            <span className="text-xs font-mono">{radius} km</span>
          </div>
          <Slider min={1} max={50} step={1} value={[radius]} onValueChange={(v) => setRadius(v[0])} />
        </div>

        {/* Hours */}
        <div className="space-y-1.5">
          <Label>Duty hours</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input type="time" value={open} onChange={(e) => setOpen(e.target.value)} />
            <Input type="time" value={close} onChange={(e) => setClose(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Switch id="autoduty" checked={autoDuty} onCheckedChange={setAutoDuty} />
            <Label htmlFor="autoduty" className="text-xs font-normal">
              Auto-toggle On/Off Duty based on these hours
            </Label>
          </div>
        </div>

        {/* Pricing */}
        <div className="space-y-1.5">
          <Label>Consultation pricing</Label>
          <RadioGroup value={pricing} onValueChange={(v) => setPricing(v as "free" | "paid")} className="flex gap-4">
            <div className="flex items-center gap-2"><RadioGroupItem value="free" id="free" /><Label htmlFor="free" className="text-sm font-normal">Free</Label></div>
            <div className="flex items-center gap-2"><RadioGroupItem value="paid" id="paid" /><Label htmlFor="paid" className="text-sm font-normal">Paid</Label></div>
          </RadioGroup>
          {pricing === "paid" && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-sm">₦</span>
              <Input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                placeholder="500"
              />
              <span className="text-xs text-muted-foreground">per consult</span>
            </div>
          )}
        </div>

        {/* Quick replies */}
        <div className="space-y-1.5">
          <Label>Quick-reply templates</Label>
          <Textarea
            value={replies}
            onChange={(e) => setReplies(e.target.value)}
            rows={6}
            placeholder="One reply per line…"
          />
          <p className="text-[10px] text-muted-foreground">One per line. Available from the ✨ button during chat.</p>
        </div>

        <Button onClick={save} disabled={busy} className="w-full">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save settings
        </Button>
      </CardContent>
    </Card>
  );
}
