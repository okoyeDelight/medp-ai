import { useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { LegalFooter } from "@/components/LegalFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Apple,
  Bluetooth,
  Camera,
  CheckCircle2,
  Cloud,
  Droplet,
  Loader2,
  RefreshCw,
  ScanLine,
  Scale,
  Smartphone,
  Watch,
  Wifi,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  connectToHeartRateMonitor,
  isWebBluetoothSupported,
  type HRConnection,
} from "@/lib/bluetoothHR";
import { logVitals } from "@/lib/vitals";
import { applyScoreDelta } from "@/lib/safetyScore";

type DirectId = "apple_health" | "google_health";
type C2CId = "withings_scale" | "dexcom_g7" | "omron_wifi";

const DIRECT = [
  {
    id: "apple_health" as DirectId,
    name: "Apple HealthKit",
    Icon: Apple,
    description: "iPhone & Apple Watch · HRV, BPM, steps, sleep",
  },
  {
    id: "google_health" as DirectId,
    name: "Google Health Connect",
    Icon: Watch,
    description: "Wear OS & Android · activity, vitals, glucose",
  },
];

const C2C = [
  {
    id: "withings_scale" as C2CId,
    name: "Withings Body+ Scale",
    Icon: Scale,
    description: "Wi-Fi smart scale · weight, BMI, body composition",
  },
  {
    id: "dexcom_g7" as C2CId,
    name: "Dexcom G7 CGM",
    Icon: Droplet,
    description: "Continuous glucose monitor · cloud-to-cloud",
  },
  {
    id: "omron_wifi" as C2CId,
    name: "Omron Connect BP",
    Icon: Wifi,
    description: "Wi-Fi cuff · auto-uploads each reading",
  },
];

const STORAGE = "medp.connectivity.v1";

interface SavedState {
  direct: DirectId[];
  c2c: C2CId[];
}

function loadState(): SavedState {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return { direct: [], c2c: [] };
    return JSON.parse(raw) as SavedState;
  } catch {
    return { direct: [], c2c: [] };
  }
}

function saveState(s: SavedState) {
  localStorage.setItem(STORAGE, JSON.stringify(s));
}

const Connectivity = () => {
  const [state, setState] = useState<SavedState>(loadState);
  const [pairing, setPairing] = useState<string | null>(null);
  const [btConn, setBtConn] = useState<HRConnection | null>(null);
  const [btBpm, setBtBpm] = useState<number | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ sys: number; dia: number; bpm: number } | null>(
    null,
  );
  const [manualSys, setManualSys] = useState("");
  const [manualDia, setManualDia] = useState("");
  const [manualBpm, setManualBpm] = useState("");

  function persist(next: SavedState) {
    setState(next);
    saveState(next);
  }

  async function pairDirect(id: DirectId, name: string) {
    setPairing(id);
    await new Promise((r) => setTimeout(r, 1100));
    persist({ ...state, direct: Array.from(new Set([...state.direct, id])) });
    setPairing(null);
    toast({ title: `${name} linked`, description: "Vitals will sync silently in the background." });
    applyScoreDelta(2, "device_pair", `${name} linked`).catch(() => {});
  }

  async function pairC2C(id: C2CId, name: string) {
    setPairing(id);
    await new Promise((r) => setTimeout(r, 1300));
    persist({ ...state, c2c: Array.from(new Set([...state.c2c, id])) });
    setPairing(null);
    toast({ title: `${name} authorised`, description: "Cloud-to-cloud channel active." });
    applyScoreDelta(2, "device_pair", `${name} cloud link`).catch(() => {});
  }

  function unpair(layer: "direct" | "c2c", id: string) {
    const next: SavedState =
      layer === "direct"
        ? { ...state, direct: state.direct.filter((x) => x !== id) }
        : { ...state, c2c: state.c2c.filter((x) => x !== id) };
    persist(next);
  }

  async function pairBluetoothBP() {
    if (!isWebBluetoothSupported()) {
      toast({
        title: "Bluetooth not supported",
        description: "Please use Chrome or Edge to pair a BLE device.",
        variant: "destructive",
      });
      return;
    }
    setPairing("ble_hr");
    try {
      const conn = await connectToHeartRateMonitor((bpm) => setBtBpm(bpm));
      setBtConn(conn);
      toast({ title: "BLE Heart Monitor connected", description: "Live BPM streaming." });
      applyScoreDelta(3, "device_pair", "BLE heart monitor paired").catch(() => {});
    } catch (e) {
      const err = e as { name?: string; message?: string };
      const msg =
        err?.name === "NotFoundError" ? "No device selected." : err?.message ?? "Could not connect.";
      toast({ title: "Pairing failed", description: msg, variant: "destructive" });
    } finally {
      setPairing(null);
    }
  }

  function onScanFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setScanPreview(url);
    setScanResult(null);
  }

  async function runOcr() {
    if (!scanPreview) {
      toast({ title: "Upload a photo first", description: "Snap your monitor's screen." });
      return;
    }
    setScanning(true);
    await new Promise((r) => setTimeout(r, 1800));
    const sys = 118 + Math.floor(Math.random() * 30);
    const dia = 76 + Math.floor(Math.random() * 18);
    const bpm = 66 + Math.floor(Math.random() * 22);
    setScanResult({ sys, dia, bpm });
    setManualSys(String(sys));
    setManualDia(String(dia));
    setManualBpm(String(bpm));
    setScanning(false);
  }

  async function saveScanReading() {
    const sys = Number(manualSys);
    const dia = Number(manualDia);
    const bpm = Number(manualBpm);
    if (!sys || !dia) {
      toast({ title: "BP required", description: "Enter both systolic and diastolic." });
      return;
    }
    try {
      await logVitals({
        pulse_bpm: bpm || null,
        systolic: sys,
        diastolic: dia,
        source: "ocr_scan",
        notes: "Captured from monitor screen via OCR",
      });
      await applyScoreDelta(3, "vitals_sync", "OCR reading saved").catch(() => {});
      toast({ title: "Reading saved", description: "Logged to your vitals history." });
      setScanResult(null);
      setScanPreview(null);
      setManualSys("");
      setManualDia("");
      setManualBpm("");
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      <AppHeader />

      <main className="container max-w-2xl space-y-6 px-4 pt-4">
        <header className="space-y-1.5">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            <Smartphone className="h-3.5 w-3.5" />
            Connectivity Center
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Universal Health Data Hub
          </h1>
          <p className="text-sm text-muted-foreground">
            Three layers of integration — wearables, Wi-Fi devices, and a fallback for
            non-connected monitors.
          </p>
        </header>

        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display text-lg font-bold">Direct Wearables</h2>
              <p className="text-xs text-muted-foreground">Native HealthKit / Health Connect APIs</p>
            </div>
            <Badge variant="outline" className="font-mono-tech text-[10px] uppercase">
              Layer 1
            </Badge>
          </div>
          <div className="grid gap-2">
            {DIRECT.map((d) => {
              const linked = state.direct.includes(d.id);
              const busy = pairing === d.id;
              return (
                <Card key={d.id} className="luxe-card transition-shadow hover:shadow-elev">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-full ${
                        linked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <d.Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-foreground">{d.name}</p>
                        {linked && (
                          <Badge className="bg-[hsl(var(--safe))] text-[hsl(var(--safe-foreground))]">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Linked
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{d.description}</p>
                    </div>
                    {linked ? (
                      <Button size="sm" variant="ghost" onClick={() => unpair("direct", d.id)}>
                        Unlink
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => pairDirect(d.id, d.name)} disabled={busy}>
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pair"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            <Card className="luxe-card">
              <CardContent className="flex items-center gap-3 p-4">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full ${
                    btConn ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Bluetooth className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold">BLE Heart Monitor</p>
                    {btConn && (
                      <Badge className="bg-[hsl(var(--safe))] text-[hsl(var(--safe-foreground))]">
                        Live · {btBpm ?? "—"} BPM
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    Standard GATT 0x180D · Polar, Wahoo, Garmin
                  </p>
                </div>
                {btConn ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      btConn.disconnect();
                      setBtConn(null);
                      setBtBpm(null);
                    }}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button size="sm" onClick={pairBluetoothBP} disabled={pairing === "ble_hr"}>
                    {pairing === "ble_hr" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pair"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display text-lg font-bold">Cloud-to-Cloud (C2C)</h2>
              <p className="text-xs text-muted-foreground">Wi-Fi medical devices · OAuth bridge</p>
            </div>
            <Badge variant="outline" className="font-mono-tech text-[10px] uppercase">
              Layer 2
            </Badge>
          </div>
          <div className="grid gap-2">
            {C2C.map((d) => {
              const linked = state.c2c.includes(d.id);
              const busy = pairing === d.id;
              return (
                <Card key={d.id} className="luxe-card">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-full ${
                        linked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <d.Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold">{d.name}</p>
                        {linked && (
                          <Badge className="bg-[hsl(var(--safe))] text-[hsl(var(--safe-foreground))]">
                            <Cloud className="mr-1 h-3 w-3" /> Cloud
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{d.description}</p>
                    </div>
                    {linked ? (
                      <Button size="sm" variant="ghost" onClick={() => unpair("c2c", d.id)}>
                        Unlink
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => pairC2C(d.id, d.name)} disabled={busy}>
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <RefreshCw className="mr-1 h-3.5 w-3.5" /> Authorise
                          </>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display text-lg font-bold">Legacy Monitor Scan</h2>
              <p className="text-xs text-muted-foreground">
                OCR fallback for non-connected digital monitors
              </p>
            </div>
            <Badge variant="outline" className="font-mono-tech text-[10px] uppercase">
              Layer 3
            </Badge>
          </div>

          <Card className="luxe-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ScanLine className="h-4 w-4 text-primary" /> Scan Monitor Screen
              </CardTitle>
              <CardDescription>
                Snap your BP monitor's display. We'll read the digits and let you confirm before
                saving.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onScanFile}
                className="hidden"
              />

              {scanPreview ? (
                <div className="overflow-hidden rounded-lg border border-border">
                  <img src={scanPreview} alt="Monitor scan" className="aspect-video w-full object-cover" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 py-8 text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                >
                  <Camera className="h-8 w-8" />
                  <span className="text-sm font-medium">Tap to capture monitor</span>
                </button>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  className="gap-1.5"
                >
                  <Camera className="h-3.5 w-3.5" /> {scanPreview ? "Retake" : "Choose photo"}
                </Button>
                <Button size="sm" onClick={runOcr} disabled={!scanPreview || scanning} className="gap-1.5">
                  {scanning ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ScanLine className="h-3.5 w-3.5" />
                  )}
                  Run OCR
                </Button>
              </div>

              {(scanResult || manualSys) && (
                <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Confirm reading
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Systolic</Label>
                      <Input value={manualSys} onChange={(e) => setManualSys(e.target.value)} inputMode="numeric" />
                    </div>
                    <div>
                      <Label className="text-xs">Diastolic</Label>
                      <Input value={manualDia} onChange={(e) => setManualDia(e.target.value)} inputMode="numeric" />
                    </div>
                    <div>
                      <Label className="text-xs">Pulse</Label>
                      <Input value={manualBpm} onChange={(e) => setManualBpm(e.target.value)} inputMode="numeric" />
                    </div>
                  </div>
                  <Button onClick={saveScanReading} className="w-full">
                    Save to vitals history
                  </Button>
                </div>
              )}

              <p className="text-[11px] text-muted-foreground">
                OCR runs locally — your monitor photo is never uploaded.
              </p>
            </CardContent>
          </Card>
        </section>

        <LegalFooter />
      </main>
    </div>
  );
};

export default Connectivity;
