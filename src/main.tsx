import { createRoot } from "react-dom/client";
import { createElement } from "react";
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("MedPAi root element is missing");
const root = createRoot(rootElement);

/**
 * Release safety boundary.
 *
 * Do not enable legacy, unreviewed triage, herb interaction, telepharmacy or
 * provider-bypass screens merely by setting public VITE_ environment flags or
 * switching to a custom domain. Those patient-facing flows must undergo
 * clinical, privacy, role/RLS and product review in a separate authorized
 * release before this entry point can mount them again.
 *
 * The current actual-entry workspace stays nonpersistent and does not load
 * the clinical App or initialize Supabase on ANY hostname.
 */
function showBootstrapFailure() {
  const panel = document.createElement("main");
  panel.setAttribute("role", "alert");
  panel.style.cssText =
    "min-height:100vh;display:grid;place-items:center;padding:24px;background:#f6f8f5;color:#183c2a;font:16px system-ui,sans-serif";
  const message = document.createElement("p");
  message.textContent =
    "MedPAi could not start. Please refresh or contact the development team. Do not enter patient information.";
  panel.append(message);
  rootElement.replaceChildren(panel);
}

void import("./preview/MedPAiPreview")
  .then(({ default: MedPAiPreview }) => {
    root.render(createElement(ErrorBoundary, null, createElement(MedPAiPreview)));
  })
  .catch(showBootstrapFailure);

// Never register a stale clinical PWA on a protected development build, even
// when hosted on a custom domain. A future production PWA needs explicit
// privacy and encrypted-offline-data design and an audited release gate.
if ("serviceWorker" in navigator) {
  void navigator.serviceWorker.getRegistrations()
    .then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
    .catch(() => {});
}
