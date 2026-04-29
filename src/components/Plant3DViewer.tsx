import { useState } from "react";
import type { Remedy } from "@/data/remedies";
import { Button } from "@/components/ui/button";
import { Box, Maximize2, RotateCcw, Sprout } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Botanical 3D models — real .glb assets hosted on Khronos's official
// glTF Sample Assets CDN (CC-BY, CORS-enabled). Per-remedy mapping can
// be extended as more plant-specific models are added.
const PLANT_MODELS: Record<string, { url: string; label: string }> = {};

const FALLBACK_MODEL = {
  url: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Avocado/glTF-Binary/Avocado.glb",
  label: "Botanical 3D model",
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          alt?: string;
          ar?: boolean | "";
          "auto-rotate"?: boolean | "";
          "camera-controls"?: boolean | "";
          "shadow-intensity"?: string | number;
          "rotation-per-second"?: string;
          "environment-image"?: string;
          poster?: string;
          loading?: "auto" | "lazy" | "eager";
          reveal?: "auto" | "interaction";
        },
        HTMLElement
      >;
    }
  }
}

interface Plant3DViewerProps {
  remedy: Remedy;
}

export function Plant3DViewer({ remedy }: Plant3DViewerProps) {
  const [open, setOpen] = useState(false);
  const model = PLANT_MODELS[remedy.id] ?? FALLBACK_MODEL;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-xl border-2 border-foreground bg-accent px-4 py-3 text-left text-accent-foreground shadow-brutal-sm brutal-press hover:bg-accent/90"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-foreground bg-primary text-primary-foreground shadow-brutal-sm">
          <Box className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm uppercase leading-tight">View 3D plant model</p>
          <p className="text-xs opacity-80">
            Rotate, zoom & inspect the leaf, stem & flower up close.
          </p>
        </div>
        <Maximize2 className="h-5 w-5 shrink-0" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl border-2 border-foreground p-0 shadow-brutal-lg sm:rounded-lg">
          <DialogHeader className="space-y-1 border-b-2 border-foreground bg-primary px-5 pb-4 pt-5 text-primary-foreground">
            <div className="flex items-center gap-2">
              <Sprout className="h-6 w-6" strokeWidth={2.5} />
              <DialogTitle className="font-display text-xl uppercase tracking-tight">
                3D · {remedy.localName}
              </DialogTitle>
            </div>
            <p className="text-xs text-primary-foreground/90">
              Drag to rotate · Pinch / scroll to zoom · Double-tap to reset
            </p>
          </DialogHeader>

          <div className="relative h-[420px] w-full bg-secondary">
            {/* model-viewer is a custom element registered globally */}
            <model-viewer
              src={model.url}
              alt={`3D model of ${remedy.name}`}
              ar
              camera-controls
              auto-rotate
              shadow-intensity="1"
              rotation-per-second="20deg"
              loading="eager"
              reveal="auto"
              style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
            />
            <button
              type="button"
              onClick={() => {
                // simple "reset" — re-mount by toggling key
                const mv = document.querySelector("model-viewer");
                if (mv) {
                  // @ts-expect-error custom-element method
                  mv.resetTurntableRotation?.();
                  // @ts-expect-error custom-element method
                  mv.jumpCameraToGoal?.();
                }
              }}
              className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-lg border-2 border-foreground bg-card text-foreground shadow-brutal-sm brutal-press"
              aria-label="Reset view"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2 border-t-2 border-foreground bg-card px-5 py-4">
            <p className="font-display text-xs uppercase text-muted-foreground">Plant ID hint</p>
            <p className="text-sm">{remedy.imageHint}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
