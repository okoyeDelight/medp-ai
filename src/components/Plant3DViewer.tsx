import { useRef, useState } from "react";
import type { Remedy } from "@/data/remedies";
import { Box, Maximize2, Minus, Plus, RotateCcw, Sprout } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import dogonyaro from "@/assets/plants/dogonyaro.jpg";
import ginger from "@/assets/plants/ginger.jpg";
import bitterleaf from "@/assets/plants/bitterleaf.jpg";
import lemongrass from "@/assets/plants/lemongrass.jpg";
import garlic from "@/assets/plants/garlic.jpg";
import scentleaf from "@/assets/plants/scentleaf.jpg";
import aloe from "@/assets/plants/aloe.jpg";
import mangoBark from "@/assets/plants/mango-bark.jpg";

// Per-remedy botanical illustrations. Each one is a hand-painted, species-accurate
// reference of THAT plant — NOT a generic stand-in. If a remedy id is not listed,
// the viewer shows an "image not yet available" notice instead of the wrong plant.
const PLANT_IMAGES: Record<string, string> = {
  dogonyaro,
  ginger,
  bitterleaf,
  lemongrass,
  garlic,
  scentleaf,
  aloe,
  "mango-bark": mangoBark,
};

interface Plant3DViewerProps {
  remedy: Remedy;
}

export function Plant3DViewer({ remedy }: Plant3DViewerProps) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [rot, setRot] = useState(0);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const image = PLANT_IMAGES[remedy.id];

  function reset() {
    setScale(1);
    setRot(0);
    setPos({ x: 0, y: 0 });
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    setPos({ x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y });
  }
  function onPointerUp() {
    dragRef.current = null;
  }
  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    setScale((s) => Math.min(4, Math.max(0.5, s - e.deltaY * 0.002)));
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className="flex w-full items-center gap-3 rounded-xl border-2 border-foreground bg-accent px-4 py-3 text-left text-accent-foreground shadow-brutal-sm brutal-press hover:bg-accent/90"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-foreground bg-primary text-primary-foreground shadow-brutal-sm">
          <Box className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm uppercase leading-tight">View plant up close</p>
          <p className="text-xs opacity-80">
            Pan, zoom & rotate to inspect leaves, stem & flower.
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
              {remedy.name} · Drag to pan · Scroll / pinch to zoom · Use buttons to rotate
            </p>
          </DialogHeader>

          <div
            className="relative h-[420px] w-full overflow-hidden bg-secondary touch-none"
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {image ? (
              <img
                src={image}
                alt={`Botanical illustration of ${remedy.name} (${remedy.localName})`}
                draggable={false}
                width={768}
                height={768}
                className="absolute left-1/2 top-1/2 h-full w-auto max-w-none select-none"
                style={{
                  transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) rotate(${rot}deg) scale(${scale})`,
                  transition: dragRef.current ? "none" : "transform 0.15s ease-out",
                  cursor: dragRef.current ? "grabbing" : "grab",
                }}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-foreground bg-card text-3xl shadow-brutal-sm">
                  {remedy.emoji}
                </div>
                <p className="font-display text-base uppercase">No plant image yet</p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  We don't ship a verified illustration for <strong>{remedy.localName}</strong>{" "}
                  yet. Rather than show the wrong plant, we'd rather show nothing — confirm with a
                  herbalist using the ID hint below.
                </p>
              </div>
            )}

            {image && (
              <div className="absolute bottom-3 right-3 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setScale((s) => Math.min(4, s + 0.25))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-foreground bg-card text-foreground shadow-brutal-sm brutal-press"
                  aria-label="Zoom in"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-foreground bg-card text-foreground shadow-brutal-sm brutal-press"
                  aria-label="Zoom out"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setRot((r) => r + 15)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-foreground bg-card text-foreground shadow-brutal-sm brutal-press"
                  aria-label="Rotate"
                >
                  <RotateCcw className="h-4 w-4 -scale-x-100" />
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-foreground bg-primary text-primary-foreground shadow-brutal-sm brutal-press"
                  aria-label="Reset view"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            )}
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
