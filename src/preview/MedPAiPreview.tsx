import { useMemo, useState, type FormEvent } from "react";
import {
  Activity, ArrowRight, Check, ChevronRight, CircleHelp, ClipboardCheck,
  ClipboardList, FileText, HeartHandshake, Layers3, LockKeyhole,
  Pill, Plus, ShieldCheck, ShieldQuestion, Sparkles, Trash2, X,
} from "lucide-react";
import "./preview.css";

/**
 * First real MedPAi capture workflow. No example clinical records, identifiers,
 * network calls, browser storage, automatic medical advice, or fabricated data.
 * Values remain in React memory only until secure backend access is verified.
 */
type Section = "overview" | "medicines" | "review" | "handoff";
type MedicineCategory = "prescribed" | "over-the-counter" | "herbal" | "other";
type EvidenceSource = "self-report" | "prescription" | "packaging" | "caregiver" | "other";
type ReportedItem = {
  id: string;
  name: string;
  category: MedicineCategory;
  source: EvidenceSource;
  reportedUse: string;
  notes: string;
  needsClarification: boolean;
};
type Draft = Omit<ReportedItem, "id" | "needsClarification">;

const EMPTY_DRAFT: Draft = {
  name: "",
  category: "prescribed",
  source: "self-report",
  reportedUse: "",
  notes: "",
};

const CATEGORIES: { value: MedicineCategory; label: string }[] = [
  { value: "prescribed", label: "Prescription medicine" },
  { value: "over-the-counter", label: "Over-the-counter medicine" },
  { value: "herbal", label: "Traditional or herbal product" },
  { value: "other", label: "Other medicine or product" },
];

const SOURCES: { value: EvidenceSource; label: string }[] = [
  { value: "self-report", label: "Person's own report" },
  { value: "prescription", label: "Prescription or clinical document" },
  { value: "packaging", label: "Medicine package or label" },
  { value: "caregiver", label: "Caregiver report" },
  { value: "other", label: "Other or unknown source" },
];

const QUESTIONS = [
  { id: "identity", title: "Confirm identity and strength", detail: "Ask a professional to check names, ingredients, strengths and sources." },
  { id: "actual-use", title: "Clarify actual use", detail: "Document what was reportedly taken rather than assuming the prescription was followed." },
  { id: "other-products", title: "Ask about additional products", detail: "Include traditional, herbal, over-the-counter and other products." },
  { id: "professional-review", title: "Request professional assessment", detail: "Only a qualified clinician or pharmacist should interpret clinical significance." },
];

const MENU: { id: Section; label: string; icon: typeof Activity }[] = [
  { id: "overview", label: "Overview", icon: Layers3 },
  { id: "medicines", label: "Medicine record", icon: Pill },
  { id: "review", label: "Review questions", icon: ClipboardCheck },
  { id: "handoff", label: "Care handoff", icon: FileText },
];

function categoryLabel(value: MedicineCategory) {
  return CATEGORIES.find(item => item.value === value)?.label ?? "Other";
}
function sourceLabel(value: EvidenceSource) {
  return SOURCES.find(item => item.value === value)?.label ?? "Other";
}

export default function MedPAiPreview() {
  const [section, setSection] = useState<Section>("overview");
  const [items, setItems] = useState<ReportedItem[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [copied, setCopied] = useState<"idle" | "yes" | "no">("idle");

  const flaggedCount = items.filter(item => item.needsClarification).length;
  const summary = useMemo(() => [
    "MEDPAi — REPORTED MEDICINE HANDOFF",
    "",
    "Status: Awaiting independent professional review.",
    "Information status: User entered, not independently verified.",
    "Storage: Session-only. No database record exists.",
    "",
    "Reported items:",
    ...(items.length ? items.flatMap(item => [
      "- " + item.name + " (" + categoryLabel(item.category) + ")",
      "  Source: " + sourceLabel(item.source),
      "  Reported use: " + (item.reportedUse || "Not provided"),
      "  Notes: " + (item.notes || "Not provided"),
      "  Clarification: " + (item.needsClarification ? "Requested" : "Not marked"),
    ]) : ["- No information has been entered"]),
    "",
    "Questions for professional follow-up:",
    ...(selectedQuestions.length
      ? QUESTIONS.filter(q => selectedQuestions.includes(q.id)).map(q => "- " + q.title)
      : ["- None selected"]),
    "",
    "No interaction clearance or clinical treatment recommendation is provided.",
    "This text is not a confirmed medication list, prescription or medical advice.",
  ].join("\n"), [items, selectedQuestions]);

  function navigate(next: Section) {
    setSection(next);
    setCopied("idle");
    if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function startAdding() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setFormOpen(true);
    navigate("medicines");
  }
  function editItem(item: ReportedItem) {
    setDraft({
      name: item.name, category: item.category, source: item.source,
      reportedUse: item.reportedUse, notes: item.notes,
    });
    setEditingId(item.id);
    setFormOpen(true);
  }
  function cancelEdit() {
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
    setFormOpen(false);
  }
  function submitItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) return;
    const entry = {
      name: name.slice(0, 140),
      category: draft.category,
      source: draft.source,
      reportedUse: draft.reportedUse.trim().slice(0, 400),
      notes: draft.notes.trim().slice(0, 600),
    };
    if (editingId) {
      setItems(old => old.map(item => item.id === editingId ? { ...item, ...entry } : item));
    } else {
      setItems(old => [...old, {
        ...entry,
        id: typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now()) + "-" + String(old.length),
        needsClarification: true,
      }]);
    }
    cancelEdit();
  }
  function toggleClarification(id: string) {
    setItems(old => old.map(item => item.id === id
      ? { ...item, needsClarification: !item.needsClarification }
      : item));
  }
  function removeItem(id: string) {
    setItems(old => old.filter(item => item.id !== id));
    if (editingId === id) cancelEdit();
  }
  function toggleQuestion(id: string) {
    setSelectedQuestions(old => old.includes(id)
      ? old.filter(question => question !== id)
      : [...old, id]);
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
        <aside className="mp-sidebar" aria-label="Workspace navigation">
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
            <div className="mp-side-status"><span className="mp-status-dot" /> SESSION ONLY</div>
            <p>Entries are not saved. Use non-identifying development input until the secure backend is ready.</p>
            <div className="mp-side-bottom-logo"><LockKeyhole size={15}/> Backend connection pending verification</div>
          </div>
        </aside>

        <div className="mp-content">
          <header className="mp-topbar">
            <div className="mp-topbar-brand"><div className="mp-brand-mark"><HeartHandshake size={20}/></div><strong>MedPAi<span className="mp-brand-dot">.</span></strong></div>
            <div className="mp-breadcrumb"><span>Workspace</span><ChevronRight size={15}/><strong>{MENU.find(item => item.id === section)?.label}</strong></div>
            <div className="mp-top-right">
              <span className="mp-demo-pill"><span className="mp-demo-pulse"/> DEVELOPMENT BUILD</span>
              <div className="mp-avatar" aria-hidden="true">M</div>
            </div>
          </header>

          <main className="mp-main" id="main-content">
            <div className="mp-intro">
              <div className="mp-eyebrow"><span className="mp-eyebrow-line"/> MEDICINE RECONCILIATION <span className="mp-eyebrow-line"/></div>
              {section === "overview" && (
                <>
                  <div className="mp-page-heading"><div><h1>Care starts with <em>clarity.</em></h1><p>Capture what someone reports taking. Keep the source and uncertainty visible.</p></div><div className="mp-heading-icon"><Activity size={24}/></div></div>
                  <div className="mp-hero">
                    <div className="mp-hero-grain" aria-hidden="true"/>
                    <div className="mp-hero-content">
                      <span className="mp-hero-kicker"><Sparkles size={14}/> MEDPAi WORKSPACE</span>
                      <h2>Every medicine has a story.<br/><span>Document what is known.</span></h2>
                      <p>Create a record from information you enter, identify what remains uncertain and prepare questions for professional review.</p>
                      <button type="button" className="mp-primary mp-primary-invert" onClick={startAdding}>
                        Add a medicine or product <ArrowRight size={18}/>
                      </button>
                    </div>
                    <div className="mp-hero-visual" aria-hidden="true">
                      <div className="mp-orbit mp-orbit-one"/><div className="mp-orbit mp-orbit-two"/>
                      <div className="mp-visual-card mp-visual-card-one"><div className="mp-visual-icon"><Pill size={17}/></div><div><b>Capture reports</b><small>Record information sources</small></div><Check size={16}/></div>
                      <div className="mp-visual-card mp-visual-card-two"><div className="mp-visual-icon"><CircleHelp size={17}/></div><div><b>Open questions</b><small>Make uncertainty visible</small></div></div>
                    </div>
                  </div>
                  <div className="mp-metrics">
                    <div className="mp-metric"><div className="mp-metric-icon"><Pill size={20}/></div><div><strong>{items.length.toString().padStart(2,"0")}</strong><span>Items entered</span></div></div>
                    <div className="mp-metric"><div className="mp-metric-icon amber"><CircleHelp size={20}/></div><div><strong>{flaggedCount.toString().padStart(2,"0")}</strong><span>Clarifications flagged</span></div></div>
                    <div className="mp-metric"><div className="mp-metric-icon blue"><ShieldQuestion size={20}/></div><div><strong>{selectedQuestions.length.toString().padStart(2,"0")}</strong><span>Review questions chosen</span></div></div>
                  </div>
                  <div className="mp-section-title"><div><span>BUILD YOUR WORKFLOW</span><h2>From reported use to a clearer handoff</h2></div></div>
                  <div className="mp-workflow">
                    <button type="button" onClick={() => navigate("medicines")} className="mp-workflow-card"><div className="mp-workflow-number">01</div><div className="mp-workflow-icon"><ClipboardList size={24}/></div><h3>Capture reported medicines</h3><p>Add items manually, with their information source and reported use.</p><span>Open record <ArrowRight size={16}/></span></button>
                    <button type="button" onClick={() => navigate("review")} className="mp-workflow-card"><div className="mp-workflow-number">02</div><div className="mp-workflow-icon"><ShieldQuestion size={24}/></div><h3>Identify open questions</h3><p>Track the questions that a professional still needs to answer.</p><span>Review questions <ArrowRight size={16}/></span></button>
                    <button type="button" onClick={() => navigate("handoff")} className="mp-workflow-card"><div className="mp-workflow-number">03</div><div className="mp-workflow-icon"><FileText size={24}/></div><h3>Prepare a care handoff</h3><p>Organize what was entered, without inventing missing information.</p><span>See handoff <ArrowRight size={16}/></span></button>
                  </div>
                </>
              )}

              {section === "medicines" && (
                <>
                  <div className="mp-page-heading"><div><h1>Medicine <em>record.</em></h1><p>Add only information that has actually been reported. Nothing is prefilled or saved.</p></div><div className="mp-heading-icon"><Pill size={24}/></div></div>
                  <div className="mp-record-heading"><div><span className="mp-category">CURRENT SESSION</span><h2>Reported medicine picture</h2><p>Unverified until a qualified professional reviews it.</p></div><button type="button" className="mp-primary" onClick={startAdding}><Plus size={17}/> Add item</button></div>

                  {formOpen && (
                    <form onSubmit={submitItem} className="mp-record-form" aria-label={editingId ? "Edit medicine item" : "Add medicine item"}>
                      <div className="mp-form-header"><div><span className="mp-category">REPORTED INFORMATION</span><h3>{editingId ? "Edit item" : "Add an item"}</h3></div><button type="button" className="mp-icon-button" onClick={cancelEdit} aria-label="Close form"><X size={19}/></button></div>
                      <div className="mp-form-grid">
                        <label className="mp-field mp-field-full"><span>Medicine or product name <b>*</b></span><input required maxLength={140} value={draft.name} onChange={e => setDraft(d => ({...d,name:e.target.value}))} placeholder="Enter the name as reported" autoComplete="off"/></label>
                        <label className="mp-field"><span>Type</span><select value={draft.category} onChange={e => setDraft(d => ({...d,category:e.target.value as MedicineCategory}))}>{CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
                        <label className="mp-field"><span>Source of information</span><select value={draft.source} onChange={e => setDraft(d => ({...d,source:e.target.value as EvidenceSource}))}>{SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
                        <label className="mp-field mp-field-full"><span>What use was reported? (optional)</span><textarea rows={2} maxLength={400} value={draft.reportedUse} onChange={e => setDraft(d => ({...d,reportedUse:e.target.value}))} placeholder="Record what was said. Do not infer a dosage." /></label>
                        <label className="mp-field mp-field-full"><span>Questions or uncertainties (optional)</span><textarea rows={2} maxLength={600} value={draft.notes} onChange={e => setDraft(d => ({...d,notes:e.target.value}))} placeholder="What still needs to be checked?"/></label>
                      </div>
                      <p className="mp-form-notice"><LockKeyhole size={15}/> No patient names, identifiers or confidential medical records. This page has no verified secure storage.</p>
                      <div className="mp-form-actions"><button type="button" className="mp-secondary" onClick={cancelEdit}>Cancel</button><button type="submit" className="mp-primary"><Check size={17}/>{editingId ? "Update item" : "Add to session"}</button></div>
                    </form>
                  )}

                  {items.length === 0 && !formOpen && (
                    <div className="mp-empty"><div className="mp-empty-icon"><Pill size={27}/></div><h3>No medicine information entered yet</h3><p>Start with a reported medicine, over-the-counter product, or traditional product. MedPAi will not invent entries.</p><button type="button" className="mp-primary" onClick={startAdding}><Plus size={18}/> Add first item</button></div>
                  )}

                  <div className="mp-item-list">
                    {items.map((item, i) => <article key={item.id} className="mp-item">
                      <div className={"mp-item-icon mp-kind-" + (item.category === "herbal" ? "uncertain" : item.category === "prescribed" ? "prescription" : "self-report")}><Pill size={22}/></div>
                      <div className="mp-item-content"><div className="mp-item-index">ITEM {String(i + 1).padStart(2,"0")} · {sourceLabel(item.source)}</div><h3>{item.name}</h3><p>{categoryLabel(item.category)}</p>
                        <div className="mp-item-detail">Reported use: {item.reportedUse || "Not provided"}</div>
                        {item.notes && <div className="mp-item-detail">Open notes: {item.notes}</div>}
                        <div className="mp-item-tag"><CircleHelp size={13}/>{item.needsClarification ? "Clarification requested" : "Not flagged · still unverified"}</div>
                      </div>
                      <div className="mp-item-actions"><button type="button" className="mp-secondary" onClick={() => editItem(item)}>Edit</button><button type="button" className={"mp-secondary" + (item.needsClarification ? " mp-selected" : "")} aria-pressed={item.needsClarification} onClick={() => toggleClarification(item.id)}>{item.needsClarification ? "Flagged" : "Flag"}</button><button type="button" className="mp-icon-button mp-delete" aria-label={"Remove " + item.name} onClick={() => removeItem(item.id)}><Trash2 size={16}/></button></div>
                    </article>)}
                  </div>
                  <div className="mp-action-row"><div><strong>{items.length} item{items.length === 1 ? "" : "s"} entered · {flaggedCount} flagged</strong><p>This work exists only in your current browser session and will disappear on refresh.</p></div><button className="mp-primary" type="button" onClick={() => navigate("review")}>Continue to review <ArrowRight size={18}/></button></div>
                </>
              )}

              {section === "review" && (
                <>
                  <div className="mp-page-heading"><div><h1>Questions before <em>answers.</em></h1><p>Choose questions for a qualified professional to assess. These are review prompts, not diagnoses.</p></div><div className="mp-heading-icon"><ShieldQuestion size={24}/></div></div>
                  <div className="mp-record-heading"><div><span className="mp-category">REVIEW WORKSPACE</span><h2>Clarification checklist</h2><p>Only selected questions will appear in the handoff.</p></div><span className="mp-soft-pill">{selectedQuestions.length} selected</span></div>
                  <div className="mp-checklist">
                    {QUESTIONS.map((q,i) => <label key={q.id} className={"mp-question" + (selectedQuestions.includes(q.id) ? " mp-question-active" : "")}>
                      <input type="checkbox" checked={selectedQuestions.includes(q.id)} onChange={() => toggleQuestion(q.id)}/>
                      <span className="mp-custom-check">{selectedQuestions.includes(q.id) && <Check size={15} strokeWidth={3}/>}</span>
                      <span className="mp-question-copy"><small>QUESTION {String(i+1).padStart(2,"0")}</small><strong>{q.title}</strong><span>{q.detail}</span></span>
                    </label>)}
                  </div>
                  <div className="mp-action-row"><div><strong>No automated clinical conclusions.</strong><p>The app does not determine whether a medicine or combination is safe.</p></div><button className="mp-primary" type="button" onClick={() => navigate("handoff")}>Prepare handoff <ArrowRight size={18}/></button></div>
                </>
              )}

              {section === "handoff" && (
                <>
                  <div className="mp-page-heading"><div><h1>One clear <em>handoff.</em></h1><p>Built only from information entered in this session. A professional must independently verify it.</p></div><div className="mp-heading-icon"><FileText size={24}/></div></div>
                  <div className="mp-handoff-header"><div className="mp-handoff-symbol"><FileText size={24}/></div><div><span className="mp-category">UNVERIFIED REPORT</span><h2>Care review summary</h2><p>Not a confirmed medication list, prescription or clinical assessment.</p></div></div>
                  <div className="mp-summary"><div className="mp-summary-top"><span><span className="mp-status-dot"/> SESSION ONLY · UNSAVED</span><span>MEDPAi</span></div><pre>{summary}</pre></div>
                  <div className="mp-action-row"><div><strong>Nothing has been saved.</strong><p>Copying is optional and may put entered data on your device's clipboard.</p></div><button className="mp-primary" type="button" onClick={() => void copySummary()} disabled={items.length === 0}><ClipboardCheck size={17}/> Copy handoff</button></div>
                  {items.length === 0 && <p className="mp-feedback" role="status">Add information to the medicine record first. No handoff can be created from an empty record.</p>}
                  {copied === "yes" && <p className="mp-feedback" role="status"><Check size={15}/> Handoff text copied to clipboard. It is not clinically verified.</p>}
                  {copied === "no" && <p className="mp-feedback" role="status">Copy unavailable. You can select the text directly.</p>}
                </>
              )}
            </div>
            <div className="mp-guardrail"><ShieldCheck size={19}/><p><strong>Development build · not connected to secure patient storage.</strong> Do not enter identifiable or confidential patient data. Nothing is saved. This app does not offer dosing, treatment or interaction clearance.</p></div>
          </main>
          <footer className="mp-footer"><span>© MedPAi · Better information for care conversations</span><span>DEVELOPMENT · SESSION ONLY</span></footer>
        </div>
      </div>
      <nav className="mp-mobile-nav" aria-label="Mobile navigation">
        {MENU.map(item => <button key={item.id} type="button" onClick={() => navigate(item.id)} aria-current={section === item.id ? "page" : undefined} className={section === item.id ? "is-active" : ""}><item.icon size={20}/><span>{item.label.split(" ")[0]}</span></button>)}
      </nav>
    </div>
  );
}
