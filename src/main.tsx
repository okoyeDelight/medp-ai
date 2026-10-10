import { createRoot } from "react-dom/client";
import { createElement } from "react";
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("MedPAi root element is missing");
const root = createRoot(rootElement);

// The Supabase client is constructed while App modules are imported. If the
// browser configuration is absent, static imports throw before React renders,
// producing a white page. Do not use dummy credentials or a live patient DB.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const configured =
  typeof url === "string" &&
  /^https:\/\/[^/]+\/.+|^https:\/\/[^/]+\/?$/.test(url) &&
  typeof key === "string" &&
  key.trim().length > 0;

if (!configured) {
  // Safe development hold: no clinical features or patient-data access.
  const panel = document.createElement("main");
  panel.setAttribute("role", "alert");
  panel.style.cssText = "min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f5faf7;color:#152c22;font-family:system-ui,sans-serif";
  const card = document.createElement("section");
  card.style.cssText = "max-width:540px;border:2px solid #183d2b;border-radius:12px;padding:28px;background:white;box-shadow:4px 4px 0 #183d2b";
  const title = document.createElement("h1");
  title.textContent = "MedPAi development preview";
  title.style.cssText = "font-size:26px;font-weight:800;margin:0 0 16px";
  const message = document.createElement("p");
  message.textContent = "This preview is temporarily unavailable while the isolated backend and security controls are configured. No patient information should be entered here.";
  message.style.cssText = "line-height:1.6;margin:0 0 12px";
  const note = document.createElement("p");
  note.textContent = "The app has not been clinically validated. Do not use it for diagnosis, treatment, medicine dosing, or emergency decisions.";
  note.style.cssText = "line-height:1.6;margin:0";
  card.append(title, message, note);
  panel.append(card);
  rootElement.replaceChildren(panel);

  // Prevent a previously cached app shell from overriding the safety hold.
  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker.getRegistrations().then((regs) =>
      Promise.all(regs.map((registration) => registration.unregister())),
    );
  }
} else {
  // Import only after validating the required browser configuration.
  void import("./App.tsx")
    .then(({ default: App }) => {
      root.render(createElement(ErrorBoundary, null, createElement(App)));
    })
    .catch(() => {
      const message = document.createElement("p");
      message.setAttribute("role", "alert");
      message.textContent = "MedPAi could not start. Please contact the development team. Do not enter patient data.";
      rootElement.replaceChildren(message);
    });

  const host = window.location.hostname;
  const previewHost =
    host.endsWith(".vercel.app") ||
    host.includes("lovable") ||
    window.self !== window.top;
  if (previewHost) {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.getRegistrations().then((regs) =>
        Promise.all(regs.map((registration) => registration.unregister())),
      );
    }
  } else {
    void import("virtual:pwa-register")
      .then(({ registerSW }) => registerSW({ immediate: true }))
      .catch(() => {});
  }
}
