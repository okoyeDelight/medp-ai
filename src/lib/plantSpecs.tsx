/**
 * Procedural 3D plant geometry.
 *
 * Each species is described by a small JSON spec (leaf shape, color, branching
 * pattern, fruit/flower) and rendered with parametric three.js geometry.
 * No external .glb files needed; the result is a real WebGL 3D model the user
 * can rotate, pan, and zoom with OrbitControls.
 */

import { useMemo } from "react";
import * as THREE from "three";
import type { ThreeElements } from "@react-three/fiber";

export type LeafShape = "lance" | "ovate" | "needle" | "blade" | "compound" | "succulent" | "broad";

export interface PlantSpec {
  /** Display name (for the alt). */
  name: string;
  /** Stem height (units). */
  stemHeight: number;
  /** Stem radius. */
  stemRadius: number;
  /** Stem color (hex or css). */
  stemColor: string;
  /** Leaf shape archetype. */
  leafShape: LeafShape;
  /** Leaf color. */
  leafColor: string;
  /** Number of leaves to scatter. */
  leafCount: number;
  /** Leaf size multiplier. */
  leafSize: number;
  /** Optional fruit / bulb / flower. */
  fruit?: { color: string; size: number; count: number; shape?: "sphere" | "cluster" | "bulb" };
  /** Optional bark texture color override. */
  barkRough?: number;
}

/** Per-remedy specs. Each plant is visually distinct. */
export const PLANT_SPECS: Record<string, PlantSpec> = {
  dogonyaro: {
    name: "Neem",
    stemHeight: 2.4,
    stemRadius: 0.08,
    stemColor: "#5a3b1f",
    leafShape: "compound",
    leafColor: "#2f7a3a",
    leafCount: 14,
    leafSize: 1,
  },
  ginger: {
    name: "Ginger",
    stemHeight: 1.6,
    stemRadius: 0.06,
    stemColor: "#7a5b34",
    leafShape: "blade",
    leafColor: "#3a8a3a",
    leafCount: 8,
    leafSize: 1.2,
    fruit: { color: "#c79a6b", size: 0.35, count: 1, shape: "bulb" },
  },
  bitterleaf: {
    name: "Bitter Leaf",
    stemHeight: 2.0,
    stemRadius: 0.07,
    stemColor: "#4a3a26",
    leafShape: "ovate",
    leafColor: "#1f5a2b",
    leafCount: 22,
    leafSize: 0.9,
  },
  lemongrass: {
    name: "Lemongrass",
    stemHeight: 1.4,
    stemRadius: 0.04,
    stemColor: "#9aa86a",
    leafShape: "blade",
    leafColor: "#7ab84a",
    leafCount: 16,
    leafSize: 1.4,
  },
  garlic: {
    name: "Garlic",
    stemHeight: 1.0,
    stemRadius: 0.05,
    stemColor: "#9aaf6a",
    leafShape: "needle",
    leafColor: "#6ea84a",
    leafCount: 6,
    leafSize: 1.1,
    fruit: { color: "#f0e8d0", size: 0.45, count: 1, shape: "bulb" },
  },
  scentleaf: {
    name: "Scent Leaf (Efinrin)",
    stemHeight: 1.8,
    stemRadius: 0.05,
    stemColor: "#6a4f30",
    leafShape: "ovate",
    leafColor: "#3a8a4a",
    leafCount: 18,
    leafSize: 0.85,
    fruit: { color: "#b89cd6", size: 0.05, count: 8, shape: "cluster" },
  },
  aloe: {
    name: "Aloe Vera",
    stemHeight: 0.2,
    stemRadius: 0.18,
    stemColor: "#8a8f5a",
    leafShape: "succulent",
    leafColor: "#7ab84a",
    leafCount: 9,
    leafSize: 1.6,
  },
  "mango-bark": {
    name: "Mango",
    stemHeight: 2.6,
    stemRadius: 0.16,
    stemColor: "#4a2f1a",
    leafShape: "lance",
    leafColor: "#2a6a3a",
    leafCount: 24,
    leafSize: 1.0,
    fruit: { color: "#f0a030", size: 0.22, count: 3, shape: "sphere" },
    barkRough: 1,
  },
};

/** Fallback for any unknown remedy id — generic broad-leaf herb. */
export const GENERIC_SPEC: PlantSpec = {
  name: "Herbal plant",
  stemHeight: 1.8,
  stemRadius: 0.07,
  stemColor: "#5a3b1f",
  leafShape: "broad",
  leafColor: "#3a8a3a",
  leafCount: 12,
  leafSize: 1,
};

/** Build a leaf shape using THREE.Shape extruded into a thin geometry. */
function makeLeafGeometry(shape: LeafShape): THREE.BufferGeometry {
  const s = new THREE.Shape();
  switch (shape) {
    case "lance":
      s.moveTo(0, 0);
      s.bezierCurveTo(0.05, 0.4, 0.15, 0.9, 0, 1.4);
      s.bezierCurveTo(-0.15, 0.9, -0.05, 0.4, 0, 0);
      break;
    case "ovate":
      s.moveTo(0, 0);
      s.bezierCurveTo(0.5, 0.2, 0.55, 0.9, 0, 1.1);
      s.bezierCurveTo(-0.55, 0.9, -0.5, 0.2, 0, 0);
      break;
    case "needle":
      s.moveTo(0, 0);
      s.lineTo(0.04, 0.6);
      s.lineTo(0, 1.4);
      s.lineTo(-0.04, 0.6);
      s.lineTo(0, 0);
      break;
    case "blade":
      s.moveTo(0, 0);
      s.bezierCurveTo(0.1, 0.5, 0.12, 1.2, 0, 1.8);
      s.bezierCurveTo(-0.12, 1.2, -0.1, 0.5, 0, 0);
      break;
    case "succulent":
      s.moveTo(0, 0);
      s.bezierCurveTo(0.18, 0.3, 0.22, 0.9, 0.05, 1.4);
      s.bezierCurveTo(0, 1.42, 0, 1.42, -0.05, 1.4);
      s.bezierCurveTo(-0.22, 0.9, -0.18, 0.3, 0, 0);
      break;
    case "compound": {
      // single leaflet for compound-leaf trees (we'll fan multiple)
      s.moveTo(0, 0);
      s.bezierCurveTo(0.08, 0.2, 0.12, 0.55, 0, 0.7);
      s.bezierCurveTo(-0.12, 0.55, -0.08, 0.2, 0, 0);
      break;
    }
    case "broad":
    default:
      s.moveTo(0, 0);
      s.bezierCurveTo(0.5, 0.4, 0.6, 1.0, 0, 1.2);
      s.bezierCurveTo(-0.6, 1.0, -0.5, 0.4, 0, 0);
      break;
  }
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.015,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 0.01,
    bevelThickness: 0.005,
  });
  geo.center();
  geo.rotateX(-Math.PI / 2);
  return geo;
}

interface PlantModelProps {
  spec: PlantSpec;
}

export function PlantModel({ spec }: PlantModelProps) {
  const leafGeo = useMemo(() => makeLeafGeometry(spec.leafShape), [spec.leafShape]);
  const stemGeo = useMemo(
    () => new THREE.CylinderGeometry(spec.stemRadius * 0.7, spec.stemRadius, spec.stemHeight, 12),
    [spec.stemHeight, spec.stemRadius],
  );

  // Pre-compute leaf placements for stable rendering
  const leaves = useMemo(() => {
    const arr: { pos: [number, number, number]; rot: [number, number, number]; scale: number }[] = [];
    if (spec.leafShape === "succulent") {
      // rosette: leaves radiating from base
      for (let i = 0; i < spec.leafCount; i++) {
        const angle = (i / spec.leafCount) * Math.PI * 2;
        arr.push({
          pos: [Math.cos(angle) * 0.05, 0.05, Math.sin(angle) * 0.05],
          rot: [Math.PI / 2 - 0.4, angle, 0],
          scale: spec.leafSize,
        });
      }
      return arr;
    }
    if (spec.leafShape === "blade") {
      // tall grasses: bunched at base, fanning upward
      for (let i = 0; i < spec.leafCount; i++) {
        const angle = (i / spec.leafCount) * Math.PI * 2;
        const tilt = 0.2 + Math.random() * 0.3;
        arr.push({
          pos: [Math.cos(angle) * 0.06, 0.05, Math.sin(angle) * 0.06],
          rot: [tilt, angle, Math.cos(angle) * tilt],
          scale: spec.leafSize * (0.85 + Math.random() * 0.4),
        });
      }
      return arr;
    }
    if (spec.leafShape === "needle") {
      // garlic-like: vertical narrow leaves
      for (let i = 0; i < spec.leafCount; i++) {
        const angle = (i / spec.leafCount) * Math.PI * 2;
        arr.push({
          pos: [Math.cos(angle) * 0.04, 0.1, Math.sin(angle) * 0.04],
          rot: [0.1, angle, Math.cos(angle) * 0.15],
          scale: spec.leafSize,
        });
      }
      return arr;
    }
    if (spec.leafShape === "compound") {
      // small leaflets scattered along upper canopy
      for (let i = 0; i < spec.leafCount; i++) {
        const t = 0.3 + Math.random() * 0.7;
        const y = spec.stemHeight * (0.6 + Math.random() * 0.4);
        const angle = Math.random() * Math.PI * 2;
        const r = 0.4 + Math.random() * 0.6;
        arr.push({
          pos: [Math.cos(angle) * r, y, Math.sin(angle) * r],
          rot: [Math.random() * 0.4 - 0.2, angle, Math.random() * 0.6 - 0.3],
          scale: spec.leafSize * t,
        });
      }
      return arr;
    }
    // Default: distribute around upper stem (broad, ovate, lance)
    for (let i = 0; i < spec.leafCount; i++) {
      const y = spec.stemHeight * (0.35 + Math.random() * 0.65);
      const angle = Math.random() * Math.PI * 2;
      const r = spec.stemRadius + 0.05 + Math.random() * 0.4;
      arr.push({
        pos: [Math.cos(angle) * r, y, Math.sin(angle) * r],
        rot: [Math.random() * 0.5 - 0.2, angle, Math.random() * 0.6 - 0.3],
        scale: spec.leafSize * (0.6 + Math.random() * 0.6),
      });
    }
    return arr;
  }, [spec]);

  const fruits = useMemo(() => {
    if (!spec.fruit) return [];
    const arr: { pos: [number, number, number]; size: number }[] = [];
    const { count, size, shape } = spec.fruit;
    for (let i = 0; i < count; i++) {
      if (shape === "bulb") {
        arr.push({ pos: [0, -0.05, 0], size });
      } else if (shape === "cluster") {
        const y = spec.stemHeight + 0.05 + Math.random() * 0.15;
        const angle = (i / count) * Math.PI * 2;
        arr.push({ pos: [Math.cos(angle) * 0.06, y, Math.sin(angle) * 0.06], size });
      } else {
        const angle = (i / count) * Math.PI * 2;
        const y = spec.stemHeight * (0.5 + Math.random() * 0.45);
        arr.push({ pos: [Math.cos(angle) * 0.5, y, Math.sin(angle) * 0.5], size });
      }
    }
    return arr;
  }, [spec]);

  const baseProps: ThreeElements["group"] = { position: [0, -spec.stemHeight / 2, 0] };

  return (
    <group {...baseProps}>
      {/* Soil mound */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <cylinderGeometry args={[0.55, 0.7, 0.12, 24]} />
        <meshStandardMaterial color="#3a2a1a" roughness={1} />
      </mesh>

      {/* Stem (skip for aloe rosette) */}
      {spec.leafShape !== "succulent" && (
        <mesh position={[0, spec.stemHeight / 2, 0]} geometry={stemGeo} castShadow>
          <meshStandardMaterial color={spec.stemColor} roughness={0.85} />
        </mesh>
      )}

      {/* Leaves */}
      {leaves.map((l, i) => (
        <mesh
          key={i}
          position={l.pos}
          rotation={l.rot}
          scale={[l.scale, l.scale, l.scale]}
          geometry={leafGeo}
          castShadow
        >
          <meshStandardMaterial
            color={spec.leafColor}
            roughness={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Fruit / bulb */}
      {fruits.map((f, i) => (
        <mesh key={`f${i}`} position={f.pos} castShadow>
          <sphereGeometry args={[f.size, 16, 16]} />
          <meshStandardMaterial color={spec.fruit!.color} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}
