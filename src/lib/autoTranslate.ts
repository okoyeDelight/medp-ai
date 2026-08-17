// Whole-app runtime translation engine.
//
// The static dictionary in i18n.tsx covers the core clinical keys. This engine
// covers EVERYTHING else: it walks the live DOM, batches every visible string to
// the `translate` edge function (Lovable AI), caches the result in localStorage,
// and re-applies on every DOM mutation so newly mounted screens translate too.
//
// English restores the original strings instantly (no network).

import { supabase } from "@/integrations/supabase/client";

const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA", "SVG", "PATH", "CANVAS",
]);
const HAS_LETTER = /\p{L}/u;

type Cache = Record<string, string>;

const originalText = new WeakMap<Text, string>();
const originalAttr = new WeakMap<Element, Record<string, string>>();
const ATTRS = ["placeholder", "aria-label", "title"] as const;

let currentLang = "en";
let currentLabel = "English";
let cache: Cache = {};
let observer: MutationObserver | null = null;
let applying = false;
let pending: number | null = null;
let inFlight = false;

function cacheKey(lang: string) {
  return `medp.tr.${lang}`;
}

function loadCache(lang: string): Cache {
  try {
    return JSON.parse(localStorage.getItem(cacheKey(lang)) || "{}") as Cache;
  } catch {
    return {};
  }
}

function saveCache(lang: string) {
  try {
    localStorage.setItem(cacheKey(lang), JSON.stringify(cache));
  } catch {
    /* quota — ignore */
  }
}

function shouldSkip(el: Element | null): boolean {
  let node: Element | null = el;
  while (node) {
    if (SKIP_TAGS.has(node.tagName)) return true;
    if (node.hasAttribute?.("data-no-translate")) return true;
    node = node.parentElement;
  }
  return false;
}

function collectTextNodes(): Text[] {
  const out: Text[] = [];
  const root = document.body;
  if (!root) return out;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n = walker.nextNode();
  while (n) {
    const text = n as Text;
    const raw = text.nodeValue ?? "";
    if (raw.trim().length > 0 && HAS_LETTER.test(raw) && !shouldSkip(text.parentElement)) {
      out.push(text);
    }
    n = walker.nextNode();
  }
  return out;
}

function collectAttrElements(): Element[] {
  const sel = ATTRS.map((a) => `[${a}]`).join(",");
  return Array.from(document.body?.querySelectorAll(sel) ?? []).filter(
    (el) => !shouldSkip(el),
  );
}

function sourceOf(text: Text): string {
  const stored = originalText.get(text);
  if (stored !== undefined) return stored;
  const raw = (text.nodeValue ?? "").trim();
  originalText.set(text, raw);
  return raw;
}

function attrSourceOf(el: Element, attr: string): string {
  const map = originalAttr.get(el) ?? {};
  if (map[attr] !== undefined) return map[attr];
  const raw = el.getAttribute(attr) ?? "";
  map[attr] = raw;
  originalAttr.set(el, map);
  return raw;
}

function writeText(text: Text, value: string) {
  const raw = text.nodeValue ?? "";
  const lead = raw.match(/^\s*/)?.[0] ?? "";
  const trail = raw.match(/\s*$/)?.[0] ?? "";
  const next = lead + value + trail;
  if (raw !== next) text.nodeValue = next;
}

function restoreAll() {
  applying = true;
  for (const text of collectTextNodes()) {
    const orig = originalText.get(text);
    if (orig !== undefined) writeText(text, orig);
  }
  for (const el of collectAttrElements()) {
    const map = originalAttr.get(el);
    if (!map) continue;
    for (const [attr, value] of Object.entries(map)) {
      if (value && el.getAttribute(attr) !== value) el.setAttribute(attr, value);
    }
  }
  applying = false;
}

async function fetchTranslations(missing: string[]) {
  const CHUNK = 60;
  for (let i = 0; i < missing.length; i += CHUNK) {
    const batch = missing.slice(i, i + CHUNK);
    const { data, error } = await supabase.functions.invoke("translate", {
      body: { language: currentLabel, texts: batch },
    });
    const translations: string[] | undefined = (data as { translations?: string[] } | null)
      ?.translations;
    if (error || !translations || translations.length !== batch.length) {
      // Cache the source so we don't hammer the endpoint on every mutation.
      batch.forEach((s) => { cache[s] = s; });
      continue;
    }
    batch.forEach((s, idx) => { cache[s] = translations[idx] || s; });
  }
  saveCache(currentLang);
}

async function pass() {
  if (currentLang === "en") return;
  const nodes = collectTextNodes();
  const attrEls = collectAttrElements();

  const sources = new Set<string>();
  const nodeSources: [Text, string][] = [];
  for (const text of nodes) {
    const src = sourceOf(text);
    if (!src) continue;
    nodeSources.push([text, src]);
    sources.add(src);
  }
  const attrSources: [Element, string, string][] = [];
  for (const el of attrEls) {
    for (const attr of ATTRS) {
      if (!el.hasAttribute(attr)) continue;
      const src = attrSourceOf(el, attr).trim();
      if (!src || !HAS_LETTER.test(src)) continue;
      attrSources.push([el, attr, src]);
      sources.add(src);
    }
  }

  // Paint whatever is already cached first (instant).
  applying = true;
  for (const [text, src] of nodeSources) if (cache[src]) writeText(text, cache[src]);
  for (const [el, attr, src] of attrSources) {
    if (cache[src] && el.getAttribute(attr) !== cache[src]) el.setAttribute(attr, cache[src]);
  }
  applying = false;

  const missing = [...sources].filter((s) => cache[s] === undefined);
  if (missing.length === 0 || inFlight) return;

  inFlight = true;
  try {
    await fetchTranslations(missing);
  } finally {
    inFlight = false;
  }

  applying = true;
  for (const [text, src] of nodeSources) if (cache[src]) writeText(text, cache[src]);
  for (const [el, attr, src] of attrSources) {
    if (cache[src] && el.getAttribute(attr) !== cache[src]) el.setAttribute(attr, cache[src]);
  }
  applying = false;
}

function schedule() {
  if (pending) window.clearTimeout(pending);
  pending = window.setTimeout(() => {
    pending = null;
    void pass();
  }, 250);
}

function startObserver() {
  if (observer) return;
  observer = new MutationObserver(() => {
    if (applying) return;
    schedule();
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: [...ATTRS],
  });
}

function stopObserver() {
  observer?.disconnect();
  observer = null;
}

/** Switch the whole app to `lang` (label is the human name sent to the model). */
export function setAutoTranslateLanguage(lang: string, label: string) {
  currentLang = lang;
  currentLabel = label;
  if (lang === "en") {
    stopObserver();
    if (pending) { window.clearTimeout(pending); pending = null; }
    restoreAll();
    return;
  }
  cache = loadCache(lang);
  startObserver();
  schedule();
}

/** True while a batch is being fetched (used for the toggle spinner). */
export function isTranslating() {
  return inFlight;
}
