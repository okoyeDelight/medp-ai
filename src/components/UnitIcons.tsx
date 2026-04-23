import type { SVGProps } from "react";

const base = {
  width: 32,
  height: 32,
  viewBox: "0 0 32 32",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function SachetIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-label="Pure water sachet">
      {/* sealed sachet */}
      <path d="M7 6 L25 6 L25 27 Q16 30 7 27 Z" fill="hsl(var(--primary) / 0.18)" />
      <path d="M7 6 L25 6" />
      <path d="M9 6 L9 4 M16 6 L16 4 M23 6 L23 4" />
      <path d="M7 6 L25 6 L25 27 Q16 30 7 27 Z" />
      <text x="16" y="20" textAnchor="middle" fontSize="6" fontWeight="800" stroke="none" fill="currentColor">
        PURE
      </text>
    </svg>
  );
}

export function EvaBottleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-label="Eva water bottle">
      <path d="M13 3 L19 3 L19 6 L20 7 L20 9 L19 10 L19 12 Q22 14 22 18 L22 27 Q22 29 20 29 L12 29 Q10 29 10 27 L10 18 Q10 14 13 12 L13 10 L12 9 L12 7 L13 6 Z" fill="hsl(var(--primary) / 0.15)" />
      <path d="M13 3 L19 3 L19 6 L20 7 L20 9 L19 10 L19 12 Q22 14 22 18 L22 27 Q22 29 20 29 L12 29 Q10 29 10 27 L10 18 Q10 14 13 12 L13 10 L12 9 L12 7 L13 6 Z" />
      <path d="M11 17 L21 17" />
      <path d="M11 22 L21 22" />
    </svg>
  );
}

export function SpoonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-label="Spoon">
      <ellipse cx="11" cy="10" rx="6" ry="7" fill="hsl(var(--accent) / 0.3)" />
      <ellipse cx="11" cy="10" rx="6" ry="7" />
      <path d="M14 14 L25 27" />
      <path d="M23 25 L26 28" />
    </svg>
  );
}

export function LeafIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-label="Leaf">
      <path d="M5 27 Q5 8 27 5 Q24 22 8 27 Z" fill="hsl(var(--primary) / 0.2)" />
      <path d="M5 27 Q5 8 27 5 Q24 22 8 27 Z" />
      <path d="M6 26 Q15 18 25 7" />
    </svg>
  );
}

export function FireIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-label="Fire">
      <path d="M16 3 Q20 9 20 13 Q24 14 24 19 Q24 27 16 28 Q8 27 8 19 Q8 14 12 13 Q14 9 16 3 Z" fill="hsl(var(--caution) / 0.4)" />
      <path d="M16 3 Q20 9 20 13 Q24 14 24 19 Q24 27 16 28 Q8 27 8 19 Q8 14 12 13 Q14 9 16 3 Z" />
      <path d="M16 14 Q18 17 18 20 Q18 24 16 25 Q14 24 14 20 Q14 17 16 14 Z" fill="hsl(var(--danger) / 0.5)" />
    </svg>
  );
}

export function CupIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-label="Cup">
      <path d="M7 10 L23 10 L22 26 Q22 28 20 28 L12 28 Q10 28 10 26 Z" fill="hsl(var(--primary) / 0.18)" />
      <path d="M7 10 L23 10 L22 26 Q22 28 20 28 L12 28 Q10 28 10 26 Z" />
      <path d="M23 13 Q27 13 27 18 Q27 22 23 22" />
      <path d="M11 6 Q12 4 11 2 M15 6 Q16 4 15 2" />
    </svg>
  );
}

export function UnitIcon({ unit, ...props }: { unit?: string } & SVGProps<SVGSVGElement>) {
  switch (unit) {
    case "sachet":
      return <SachetIcon {...props} />;
    case "eva":
      return <EvaBottleIcon {...props} />;
    case "spoon":
      return <SpoonIcon {...props} />;
    case "leaf":
      return <LeafIcon {...props} />;
    case "fire":
      return <FireIcon {...props} />;
    case "cup":
      return <CupIcon {...props} />;
    default:
      return <LeafIcon {...props} />;
  }
}
