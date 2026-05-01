import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, Html } from "@react-three/drei";
import type { Remedy } from "@/data/remedies";
import { Box, Loader2, Maximize2, RotateCcw, Sprout } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GENERIC_SPEC, PLANT_SPECS, PlantModel } from "@/lib/plantSpecs";

interface Plant3DViewerProps {
  remedy: Remedy;
}

export function Plant3DViewer({ remedy }: Plant3DViewerProps) {
  const [open, setOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const spec = PLANT_SPECS[remedy.id] ?? GENERIC_SPEC;

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
            Real WebGL 3D — drag to rotate, pinch to zoom.
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
                {remedy.localName}
              </DialogTitle>
            </div>
            <p className="text-xs text-primary-foreground/90">
              {remedy.name} · Drag to rotate · Right-click drag (or two-finger) to pan · Scroll/pinch to zoom
            </p>
          </DialogHeader>

          <div className="relative h-[440px] w-full bg-gradient-to-b from-secondary to-muted">
            <Canvas
              key={resetKey}
              shadows
              camera={{ position: [3, 2.5, 3], fov: 45 }}
              dpr={[1, 2]}
            >
              <Suspense
                fallback={
                  <Html center>
                    <div className="flex items-center gap-2 rounded-md border-2 border-foreground bg-card px-3 py-2 font-mono-tech text-xs uppercase">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading
                    </div>
                  </Html>
                }
              >
                <Stage
                  intensity={0.5}
                  environment="park"
                  shadows={{ type: "contact", opacity: 0.5, blur: 2 }}
                  adjustCamera={1.2}
                >
                  <PlantModel spec={spec} />
                </Stage>
              </Suspense>
              <OrbitControls
                makeDefault
                enableDamping
                dampingFactor={0.08}
                minDistance={2}
                maxDistance={10}
                autoRotate
                autoRotateSpeed={0.6}
              />
            </Canvas>

            <button
              type="button"
              onClick={() => setResetKey((k) => k + 1)}
              className="absolute bottom-3 right-3 flex h-9 items-center gap-1.5 rounded-lg border-2 border-foreground bg-card px-3 text-foreground shadow-brutal-sm brutal-press"
              aria-label="Reset view"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="font-mono-tech text-[10px] uppercase">Reset</span>
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
