import { createRoot } from "react-dom/client";
import { createElement } from "react";
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("MedPAi root element is missing");
const root = createRoot(rootElement);

const host = window.location.hostname;
const isVercelPreview = host.endsWith(".vercel.app");
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const hasBackendConfig =
  typeof supabaseUrl === "string" &&
  /^https:\/\/[^/]+\/?$/.test(supabaseUrl) &&
  typeof supabaseKey === "string" &&
  supabaseKey.trim().length > 0;

// Git-connected Vercel preview builds are SAMPLE ONLY, even if someone later
// adds Supabase environment variables. Do not expose unreviewed clinical
// screens or connect an unverified real patient backend to this preview.
const useSampleWorkspace = isVercelPreview || !hasBackendConfig;

const showBootstrapFailure = () => {
  const panel = document.createElement("main");
  panel.setAttribute("role", "alert");
  panel.style.cssText =
    "min-height:100vh;display:grid;place-items:center;padding:24px;background:#f6f8f5;color:#183c2a;font:16px system-ui,sans-serif";
  const message = document.createElement("p");
  message.textContent =
    "The MedPAi preview could not start. Please refresh the page or contact the development team. Do not enter patient information.";
  panel.append(message);
  rootElement.replaceChildren(panel);
};

if (useSampleWorkspace) {
  // Standalone preview contains only invented records and in-memory controls.
  // It does not import the clinical App or its Supabase dependencies.
  void import("./preview/MedPAiPreview")
    .then(({ default: MedPAiPreview }) => {
      root.render(createElement(ErrorBoundary, null, createElement(MedPAiPreview)));
    })
    .catch(showBootstrapFailure);
} else {
  void import("./App.tsx")
    .then(({ default: App }) => {
      root.render(createElement(ErrorBoundary, null, createElement(App)));
    })
    .catch(showBootstrapFailure);
}

// A stale PWA from a previous release must not serve obsolete preview markup.
// Disable registrations on all Vercel preview hosts and iframe editor previews.
const isPreviewHost = isVercelPreview || host.includes("lovable") || window.self !== window.top;
if (isPreviewHost || useSampleWorkspace) {
  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker.getRegistrations()
      .then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
      .catch(() => {});
  }
} else {
  void import("virtual:pwa-register")
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => {});
}
