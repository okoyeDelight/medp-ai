import { useMemo, useState } from "react";
import {
  Activity, ArrowRight, Check, ChevronRight, CircleHelp, ClipboardCheck,
  ClipboardList, FileText, HeartHandshake, Layers3, LockKeyhole,
  Pill, Plus, ShieldCheck, ShieldQuestion, Sparkles,
} from "lucide-react";
import "./preview.css";

/**
 * Deliberately isolated from the unverified Supabase backend.
 * Every item below is invented sample information; no real patient input,
 * advice, drug-safety conclusion, or data persistence belongs in this preview.
 */
type Section = "overview" | "medicines" | "review" | "handoff";
type SampleItem = {
  id: string;
  title: string;
  description: string;
  origin: string;
  tag: string;
  kind: "prescription" | "self-report" | "uncertain";
};

const SAMPLE_ITEMS: SampleItem[] = [
  {
    id: "rx",
    title: "Medicine A",
    description: "Prescription listed in the example clinic record",
    origin: "Example record",
    tag: "Name and strength need confirmation",
    kind: "prescription",
  },
  {
    id: "otc",
    title: "Medicine B",
    description: "Over-the-counter medicine reported in conversation",
    origin: "Example patient report",
    tag: "Frequency not yet documented",
    kind: "self-report",
  },
  {
    id: "herb",
    title: "Unidentified herbal product",
    description: "Reported additional product; ingredients are unknown",
    origin: "Example patient report",
    tag: "Product identity needs clarification",
    kind: "uncertain",
  },
];

const QUESTIONS = [
  { id: "identity", title: "Confirm medicine identity", detail: "Match the reported names and strengths to a reliable source." },
  { id: "frequency", title: "Clarify actual use", detail: "Ask what was really taken and when, without assuming adherence." },
  { id: "ingredients", title: "Identify the herbal product", detail: "Request its label or ingredients. Do not infer interactions." },
  { id: "clinician", title: "Arrange professional review", detail: "A qualified professional must assess clinical significance." },
];

const MENU: { id: Section; label: string; icon: typeof Activity }[] = [
  { id: "overview", label: "Overview", icon: Layers3 },
  { id: "medicines", label: "Medicine record", icon: Pill },
  { id: "review", label: "Review questions", icon: ClipboardCheck },
  { id: "handoff", label: "Care handoff", icon: FileText },
];

export default function MedPAiPreview() {
  const [section, setSection] = useState<Section>("overview");
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>(["identity", "ingredients"]);
  const [flaggedItems, setFlaggedItems] = useState<string[]>([]);
  const [copied, setCopied] = useState<"idle" | "yes" | "no">("idle");
  const summary = useMemo(
    () => [
      "MEDPAi — SAMPLE CARE HANDOFF (NOT A PATIENT RECORD)",
      "",
      "Status: Not clinically reviewed. No safety assessment performed.",
      "Source: Invented examples for interface demonstration only.",
      "",
      "Reported items:",
      ...SAMPLE_ITEMS.map(item => "- " + item.title + ": " + item.description + " (" + item.origin + ")"),
      "",
      "Questions selected for follow-up:",
      ...(selectedQuestions.length
        ? QUESTIONS.filter(q => selectedQuestions.includes(q.id)).map(q => "- " + q.title)
        : ["- None selected; follow-up still required"]),
      "",
      "Items flagged for clarification:",
      ...(flaggedItems.length
        ? SAMPLE_ITEMS.filter(item => flaggedItems.includes(item.id)).map(item => "- " + item.title)
        : ["- None flagged"]),
      "",
      "Clinical interpretation, prescribing, and safety clearance: NOT PROVIDED.",
    ].join("\n"),
    [selectedQuestions, flaggedItems],
  );

  function navigate(next: Section) {
    setSection(next);
    setCopied("idle");
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  }
  function toggleQuestion(id: string) {
    setSelectedQuestions(items => items.includes(id) ? items.filter(q => q !== id) : [...items, id]);
  }
  function toggleFlag(id: string) {
    setFlaggedItems(items => items.includes(id) ? items.filter(item => item !== id) : [...items, id]);
  }
  async function copySummary() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(summary);
      setCopied("yes");
    } catch {
      setCopied("no");
    }
  }

  return (
    <div className="mp-preview">
      <div className="mp-shell">
        <aside className="mp-sidebar" aria-label="Preview navigation">
          <div className="mp-brand">
            <div className="mp-brand-mark"><HeartHandshake size={24} strokeWidth={2.2} /></div>
            <div><strong>MedPAi<span className="mp-brand-dot">.</span></strong><small>CARE INTELLIGENCE</small></div>
          </div>
          <div className="mp-side-label">WORKSPACE</div>
          <nav className="mp-sidebar-nav" aria-label="Main sections">
            {MENU.map(item => (
              <button key={item.id} type="button" onClick={() => navigate(item.id)}
                className={"mp-nav-link" + (section === item.id ? " mp-nav-active" : "")}
                aria-current={section === item.id ? "page" : undefined}>
                <item.icon size={18} /><span>{item.label}</span>
                {section === item.id && <ChevronRight size={16} className="mp-nav-chevron" />}
              </button>
            ))}
          </nav>
          <div className="mp-side-bottom">
            <div className="mp-side-status"><span className="mp-status-dot" /> FRONTEND PREVIEW</div>
            <p>Explore the product workflow with example data, without a connected database.</p>
            <div className="mp-side-bottom-logo"><LockKeyhole size={15} /> Protected development workspace</div>
          </div>
        </aside>

        <div className="mp-content">
          <header className="mp-topbar">
            <div className="mp-topbar-brand"><div className="mp-brand-mark"><HeartHandshake size={20} /></div><strong>MedPAi<span className="mp-brand-dot">.</span></strong></div>
            <div className="mp-breadcrumb"><span>Workspace</span><ChevronRight size={15}/><strong>{MENU.find(item => item.id === section)?.label}</strong></div>
            <div className="mp-top-right"><span className="mp-demo-pill"><span className="mp-demo-pulse"/> SAMPLE WORKSPACE</span><div className="mp-avatar" title="Demo workspace">M</div></div>
          </header>

          <main className="mp-main" id="main-content">
            <div className="mp-intro">
              <div className="mp-eyebrow"><span className="mp-eyebrow-line" /> DEVELOPMENT PREVIEW <span className="mp-eyebrow-line" /></div>
              {section === "overview" && (
                <>
                  <div className="mp-page-heading"><div><h1>Care starts with <em>clarity.</em></h1><p>A clearer picture of what someone actually takes—before decisions are made.</p></div><div className="mp-heading-icon"><Activity size={24}/></div></div>
                  <div className="mp-hero">
                    <div className="mp-hero-grain" aria-hidden="true" />
                    <div className="mp-hero-content">
                      <span className="mp-hero-kicker"><Sparkles size={14}/> THE MEDPAi WORKFLOW</span>
                      <h2>Every medicine has a story.<br/><span>Bring it all together.</span></h2>
                      <p>See how a care team could document reported prescriptions, other medicines and traditional products—while keeping uncertainty visible.</p>
                      <button type="button" className="mp-primary mp-primary-invert" onClick={() => navigate("medicines")}>
                        Explore the sample record <ArrowRight size={18}/>
                      </button>
                    </div>
                    <div className="mp-hero-visual" aria-hidden="true">
                      <div className="mp-orbit mp-orbit-one" /><div className="mp-orbit mp-orbit-two" />
                      <div className="mp-visual-card mp-visual-card-one"><div className="mp-visual-icon"><Pill size={17}/></div><div><b>Reported items</b><small>Capture with context</small></div><Check size={16}/></div>
                      <div className="mp-visual-card mp-visual-card-two"><div className="mp-visual-icon"><CircleHelp size={17}/></div><div><b>Open questions</b><small>Keep uncertainty visible</small></div><span className="mp-mini-badge">REVIEW</span></div>
                    </div>
                  </div>
                  <div className="mp-metrics">
                    <div className="mp-metric"><div className="mp-metric-icon"><Pill size={20}/></div><div><strong>03</strong><span>Example reported items</span></div></div>
                    <div className="mp-metric"><div className="mp-metric-icon amber"><CircleHelp size={20}/></div><div><strong>04</strong><span>Questions for review</span></div></div>
                    <div className="mp-metric"><div className="mp-metric-icon blue"><ShieldQuestion size={20}/></div><div><strong>00</strong><span>Clinical conclusions</span></div></div>
                  </div>
                  <div className="mp-section-title"><div><span>HOW IT WORKS</span><h2>A more complete care conversation</h2></div></div>
                  <div className="mp-workflow">
                    <button type="button" onClick={() => navigate("medicines")} className="mp-workflow-card"><div className="mp-workflow-number">01</div><div className="mp-workflow-icon"><ClipboardList size={24}/></div><h3>Document what is reported</h3><p>Record each item alongside where the information came from.</p><span>Open record <ArrowRight size={16}/></span></button>
                    <button type="button" onClick={() => navigate("review")} className="mp-workflow-card"><div className="mp-workflow-number">02</div><div className="mp-workflow-icon"><ShieldQuestion size={24}/></div><h3>Keep questions visible</h3><p>Identify what is still unknown instead of declaring something safe.</p><span>Review questions <ArrowRight size={16}/></span></button>
                    <button type="button" onClick={() => navigate("handoff")} className="mp-workflow-card"><div className="mp-workflow-number">03</div><div className="mp-workflow-icon"><FileText size={24}/></div><h3>Prepare a clear handoff</h3><p>Share the reported picture and the questions a clinician should check.</p><span>See handoff <ArrowRight size={16}/></span></button>
                  </div>
                </>
              )}

              {section === "medicines" && (
                <>
                  <div className="mp-page-heading"><div><h1>Medicine <em>record.</em></h1><p>Different sources, one place. This is a fictional example record.</p></div><div className="mp-heading-icon"><Pill size={24}/></div></div>
                  <div className="mp-record-heading"><div><span className="mp-category">EXAMPLE CASE / 001</span><h2>Reported medicine picture</h2><p>Not a complete or verified medication list.</p></div><span className="mp-soft-pill"><Layers3 size={14}/> 3 sample items</span></div>
                  <div className="mp-item-list">
                    {SAMPLE_ITEMS.map((item, i) => <article key={item.id} className="mp-item">
                      <div className={"mp-item-icon mp-kind-" + item.kind}>{item.kind === "uncertain" ? <CircleHelp size={22}/> : <Pill size={22}/>}</div>
                      <div className="mp-item-content"><div className="mp-item-index">ITEM {String(i + 1).padStart(2, "0")} · {item.origin}</div><h3>{item.title}</h3><p>{item.description}</p><div className="mp-item-tag"><CircleHelp size={13}/>{item.tag}</div></div>
                      <button type="button" aria-pressed={flaggedItems.includes(item.id)} onClick={() => toggleFlag(item.id)} className={"mp-secondary mp-item-button" + (flaggedItems.includes(item.id) ? " mp-selected" : "")}>
                        {flaggedItems.includes(item.id) ? <><Check size={16}/> Flagged</> : <><Plus size={16}/> Flag</>}
                      </button>
                    </article>)}
                  </div>
                  <div className="mp-action-row"><div><strong>{flaggedItems.length} item{flaggedItems.length === 1 ? "" : "s"} flagged</strong><p>Flags affect only this temporary example session.</p></div><button className="mp-primary" type="button" onClick={() => navigate("review")}>Continue to review <ArrowRight size={18}/></button></div>
                </>
              )}

              {section === "review" && (
                <>
                  <div className="mp-page-heading"><div><h1>Questions before <em>answers.</em></h1><p>Build an example checklist for a qualified professional to review.</p></div><div className="mp-heading-icon"><ShieldQuestion size={24}/></div></div>
                  <div className="mp-record-heading"><div><span className="mp-category">REVIEW WORKSPACE</span><h2>Open clarification questions</h2><p>Select which questions to include in the sample handoff.</p></div><span className="mp-soft-pill">{selectedQuestions.length} selected</span></div>
                  <div className="mp-checklist">
                    {QUESTIONS.map((q, i) => <label key={q.id} className={"mp-question" + (selectedQuestions.includes(q.id) ? " mp-question-active" : "")}>
                      <input type="checkbox" checked={selectedQuestions.includes(q.id)} onChange={() => toggleQuestion(q.id)} />
                      <span className="mp-custom-check">{selectedQuestions.includes(q.id) && <Check size={15} strokeWidth={3}/>}</span>
                      <span className="mp-question-copy"><small>QUESTION {String(i + 1).padStart(2, "0")}</small><strong>{q.title}</strong><span>{q.detail}</span></span>
                    </label>)}
                  </div>
                  <div className="mp-action-row"><div><strong>Uncertainty is information.</strong><p>These questions do not establish whether any combination is safe.</p></div><button className="mp-primary" type="button" onClick={() => navigate("handoff")}>Create sample handoff <ArrowRight size={18}/></button></div>
                </>
              )}

              {section === "handoff" && (
                <>
                  <div className="mp-page-heading"><div><h1>One clear <em>handoff.</em></h1><p>A transparent example summary, ready for human review.</p></div><div className="mp-heading-icon"><FileText size={24}/></div></div>
                  <div className="mp-handoff-header"><div className="mp-handoff-symbol"><FileText size={24}/></div><div><span className="mp-category">DEMONSTRATION ONLY</span><h2>Care review summary</h2><p>Generated from the sample items and selections on this screen.</p></div></div>
                  <div className="mp-summary"><div className="mp-summary-top"><span><span className="mp-status-dot" /> EXAMPLE · NOT A MEDICAL RECORD</span><span>MEDPAi / 001</span></div><pre>{summary}</pre></div>
                  <div className="mp-action-row"><div><strong>Nothing has been saved.</strong><p>Review carefully: this summary is not a clinical assessment.</p></div><button className="mp-primary" type="button" onClick={() => void copySummary()}><ClipboardCheck size={17}/> Copy example</button></div>
                  {copied === "yes" && <p className="mp-feedback" role="status"><Check size={15}/> Example summary copied. It contains no real patient data.</p>}
                  {copied === "no" && <p className="mp-feedback" role="status">Your browser blocked copying. You can select the example text directly.</p>}
                </>
              )}
            </div>
            <div className="mp-guardrail"><ShieldCheck size={19}/><p><strong>Development sandbox · sample information only.</strong> No patient records are used or saved. No interaction assessment, clinical verification, diagnosis, dosing or treatment recommendation is provided.</p></div>
          </main>

          <footer className="mp-footer"><span>© MedPAi · Designed for clearer care conversations</span><span>FRONTEND PREVIEW / BACKEND NOT CONNECTED</span></footer>
        </div>
      </div>
      <nav className="mp-mobile-nav" aria-label="Mobile navigation">
        {MENU.map(item => <button key={item.id} type="button" onClick={() => navigate(item.id)} aria-current={section === item.id ? "page" : undefined} className={section === item.id ? "is-active" : ""}><item.icon size={20}/><span>{item.label.split(" ")[0]}</span></button>)}
      </nav>
    </div>
  );
}
