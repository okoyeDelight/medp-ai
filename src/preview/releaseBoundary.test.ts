import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Deliberate release-gate regression test. The legacy clinical App stays
// unbundled until its own reviewed clinical/security rollout PR.
const bootstrap = readFileSync(resolve(process.cwd(), "src/main.tsx"), "utf8");

describe("reviewed-release boundary", () => {
  it("cannot mount the old unreviewed clinical App via a public Vite env flag", () => {
    expect(bootstrap).not.toContain('import("./App.tsx")');
    expect(bootstrap).not.toContain("VITE_MEDPAI_CLINICAL_APP_ENABLED");
    expect(bootstrap).toContain('import("./preview/MedPAiPreview")');
  });

  it("does not register a PWA that could cache sensitive clinical screens", () => {
    expect(bootstrap).not.toContain('import("virtual:pwa-register")');
    expect(bootstrap).toContain("registration.unregister()");
  });
});
