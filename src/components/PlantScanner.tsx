import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, ImageUp, Loader2, ScanLine, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { REMEDIES, type Remedy } from "@/data/remedies";
import { toast } from "@/hooks/use-toast";

interface PlantScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIdentified: (remedy: Remedy) => void;
}

type Status = "idle" | "scanning" | "no-match";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Resize to max 1024px (saves bandwidth & cost)
async function shrinkImage(dataUrl: string, maxSide = 1024): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function PlantScanner({ open, onOpenChange, onIdentified }: PlantScannerProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [reason, setReason] = useState<string>("");
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStatus("idle");
    setPreview(null);
    setReason("");
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setStatus("scanning");
    setReason("");
    try {
      const raw = await fileToDataUrl(file);
      const small = await shrinkImage(raw);
      setPreview(small);

      const candidates = REMEDIES.map((r) => ({
        id: r.id,
        name: r.name,
        localName: r.localName,
      }));

      const { data, error } = await supabase.functions.invoke("identify-plant", {
        body: { imageBase64: small, candidates },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const matchedId: string | null = data?.id ?? null;
      const conf: string = data?.confidence ?? "low";
      const why: string = data?.reason ?? "";

      if (!matchedId) {
        setStatus("no-match");
        setReason(why || "We no fit identify this plant. Try clearer photo of the leaf.");
        return;
      }

      const remedy = REMEDIES.find((r) => r.id === matchedId);
      if (!remedy) {
        setStatus("no-match");
        setReason("Match no dey our list yet.");
        return;
      }

      toast({
        title: `Identified: ${remedy.localName} ${remedy.emoji}`,
        description: `${conf.toUpperCase()} confidence — ${why}`,
      });
      onIdentified(remedy);
      onOpenChange(false);
      // Reset for next time after dialog closes
      setTimeout(reset, 300);
    } catch (e) {
      console.error(e);
      setStatus("no-match");
      const msg = e instanceof Error ? e.message : "Scan failed";
      setReason(msg);
      toast({
        title: "Scan failed",
        description: msg,
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setTimeout(reset, 300);
      }}
    >
      <DialogContent className="max-w-md border-2 border-foreground p-0 shadow-brutal-lg sm:rounded-lg">
        <DialogHeader className="space-y-2 border-b-2 border-foreground bg-primary px-5 pb-4 pt-5 text-primary-foreground">
          <div className="flex items-center gap-2">
            <ScanLine className="h-6 w-6" strokeWidth={2.5} />
            <DialogTitle className="font-display text-xl uppercase tracking-tight">
              Plant Scanner
            </DialogTitle>
          </div>
          <p className="text-sm text-primary-foreground/90">
            Snap or upload one clear photo of the leaf. We go check am with AI.
          </p>
        </DialogHeader>

        <div className="space-y-4 px-5 py-5">
          {/* Preview */}
          <div className="flex h-48 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-foreground/40 bg-muted">
            {preview ? (
              <img src={preview} alt="Preview" className="h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                <Sparkles className="h-8 w-8" />
                <p className="font-mono-tech text-xs uppercase">No photo yet</p>
              </div>
            )}
          </div>

          {status === "scanning" && (
            <div className="flex items-center gap-2 rounded-lg border-2 border-foreground bg-accent p-3 text-accent-foreground shadow-brutal-sm">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="font-display text-sm uppercase">AI dey check the leaf…</p>
            </div>
          )}

          {status === "no-match" && reason && (
            <div className="rounded-lg border-2 border-danger bg-danger/10 p-3 text-sm text-danger">
              ⚠️ {reason}
            </div>
          )}

          {/* Hidden inputs */}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          <div className="grid grid-cols-2 gap-3">
            <Button
              size="lg"
              className="h-14 border-2 border-foreground bg-primary font-display text-sm uppercase text-primary-foreground shadow-brutal-sm brutal-press hover:bg-primary/90"
              onClick={() => cameraRef.current?.click()}
              disabled={status === "scanning"}
            >
              <Camera className="h-5 w-5" /> Snap
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 border-2 border-foreground bg-background font-display text-sm uppercase shadow-brutal-sm brutal-press"
              onClick={() => galleryRef.current?.click()}
              disabled={status === "scanning"}
            >
              <ImageUp className="h-5 w-5" /> Upload
            </Button>
          </div>

          <p className="text-center font-mono-tech text-[10px] uppercase text-muted-foreground">
            I be AI, I no be Doctor — always confirm with Pharmacist.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
