import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Deliberate release-gate regression test. The legacy clinical App stays
// unbundled until its own reviewed clinical/security rollout PR.
const bootstrap = readFileSync(resolve(process.cwd(), "src/main.tsx"), "utf8");
const viteConfig = readFileSync(resolve(process.cwd(), "vite.config.ts"), "utf8");
const htmlShell = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

describe("reviewed-release boundary", () => {
  it("cannot mount the old unreviewed clinical App via a public Vite env flag", () => {
    expect(bootstrap).not.toContain('import("./App.tsx")');
    expect(bootstrap).not.toContain("VITE_MEDPAI_CLINICAL_APP_ENABLED");
    expect(bootstrap).toContain('import("./preview/MedPAiPreview")');
  });

  it("does not register or generate an unreviewed clinical PWA", () => {
    expect(bootstrap).not.toContain('import("virtual:pwa-register")');
    expect(bootstrap).toContain("registration.unregister()");
    expect(viteConfig).not.toContain('import { VitePWA }');
    expect(viteConfig).not.toContain("    VitePWA({");
  });

  it("does not load an unrelated external model-viewer script into this workspace", () => {
    expect(htmlShell).not.toContain("https://unpkg.com/");
    expect(htmlShell).not.toContain("model-viewer@");
  });
});
