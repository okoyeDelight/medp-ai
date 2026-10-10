import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  // Production hardening: strip source maps + console/debugger.
  build: {
    sourcemap: false,
    minify: "esbuild",
  },
  esbuild:
    mode === "production"
      ? { drop: ["console", "debugger"], legalComments: "none" }
      : {},
  plugins: [
    react(),
    mcpPlugin(),
    mode === "development" && componentTagger(),
    // Clinical offline caching is deliberately disabled until shared-device,
    // encryption, revocation, consent, and secure sync are reviewed.
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
