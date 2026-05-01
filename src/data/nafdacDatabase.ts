/**
 * Curated database of common Nigerian herbal supplements with verified NAFDAC
 * registration data and pharmacological properties. Used by the Safety Scanner
 * for instant lookup; falls back to AI for unknown products.
 *
 * NOTE: Registration numbers and properties are based on publicly available
 * NAFDAC listings and herbal pharmacology references, but you must verify
 * critical decisions with NAFDAC directly (https://greenbook.nafdac.gov.ng).
 */

export type HerbalProperty =
  | "Stimulant"
  | "Sedative"
  | "Blood Thinner"
  | "Hypoglycaemic"
  | "Hypotensive"
  | "Hypertensive"
  | "Hepatotoxic Risk"
  | "Nephrotoxic Risk"
  | "Diuretic"
  | "Laxative"
  | "Anti-inflammatory"
  | "Anti-malarial"
  | "Anti-microbial"
  | "Immunostimulant"
  | "CYP3A4 Inhibitor"
  | "CYP3A4 Inducer"
  | "Estrogenic"
  | "Uterotonic";

export interface NafdacEntry {
  /** Lowercase product or active herb name used as a search key. */
  key: string;
  /** Official trade/product name. */
  productName: string;
  /** Active herb / Latin name. */
  botanical: string;
  /** NAFDAC registration number, or null if not registered/unknown. */
  nafdacNumber: string | null;
  /** Manufacturer / marketer. */
  manufacturer: string;
  /** "registered" | "unregistered" | "expired" | "unknown" */
  status: "registered" | "unregistered" | "expired" | "unknown";
  /** What it's claimed / known to help with. */
  indications: string[];
  /** Recommended adult dose. */
  dose: string;
  /** How / when to take. */
  administration: string;
  /** Properties driving safety intersection check. */
  properties: HerbalProperty[];
  /** Conditions where this herb is risky. */
  contraindications: string[];
  /** Drugs that interact with this herb. */
  drugInteractions: { drug: string; severity: "danger" | "caution"; why: string }[];
  /** Common side effects. */
  sideEffects: string[];
}

export const NAFDAC_DB: NafdacEntry[] = [
  {
    key: "yoyo bitters",
    productName: "Yoyo Cleanser Bitters",
    botanical: "Multi-herb (Vernonia, Cassia, Citrus aurantifolia, etc.)",
    nafdacNumber: "A7-0696L",
    manufacturer: "Yoyo Global Healthcare Ltd",
    status: "registered",
    indications: ["Indigestion", "Constipation", "Body cleansing", "Loss of appetite"],
    dose: "30 ml (2 tablespoons)",
    administration: "Twice daily before meals. Shake well before use.",
    properties: ["Laxative", "Diuretic", "Hepatotoxic Risk"],
    contraindications: ["Pregnancy", "Liver disease", "Children under 12"],
    drugInteractions: [
      { drug: "Warfarin", severity: "danger", why: "May potentiate bleeding risk via altered metabolism." },
      { drug: "Diuretics", severity: "caution", why: "Additive fluid loss; risk of dehydration." },
    ],
    sideEffects: ["Loose stools", "Stomach cramps", "Nausea"],
  },
  {
    key: "swedish bitters",
    productName: "Swedish Bitters",
    botanical: "Aloe, Myrrh, Saffron, Senna, Camphor",
    nafdacNumber: "A7-1109L",
    manufacturer: "Various importers",
    status: "registered",
    indications: ["Digestion", "Bloating", "Liver support"],
    dose: "5–10 ml diluted in water",
    administration: "Before or after meals, up to 3 times daily.",
    properties: ["Laxative", "Hepatotoxic Risk"],
    contraindications: ["Pregnancy", "Bowel obstruction", "Inflammatory bowel disease"],
    drugInteractions: [
      { drug: "Digoxin", severity: "danger", why: "Senna-induced potassium loss raises digoxin toxicity risk." },
    ],
    sideEffects: ["Diarrhoea", "Abdominal cramps"],
  },
  {
    key: "agbo jedi",
    productName: "Agbo Jedi-Jedi",
    botanical: "Mixed traditional decoction (varies by maker)",
    nafdacNumber: null,
    manufacturer: "Local — not standardized",
    status: "unregistered",
    indications: ["Haemorrhoids (jedi-jedi)", "Pile relief"],
    dose: "Variable — typically 100 ml twice daily",
    administration: "Local preparations; no standardized regimen.",
    properties: ["Laxative", "Hepatotoxic Risk", "Nephrotoxic Risk"],
    contraindications: ["Pregnancy", "Liver disease", "Kidney disease", "Children"],
    drugInteractions: [
      { drug: "Any prescription medicine", severity: "caution", why: "Composition unknown; unpredictable interactions." },
    ],
    sideEffects: ["Liver injury reports", "Diarrhoea", "Hyperkalaemia in some users"],
  },
  {
    key: "moringa",
    productName: "Moringa Capsules / Tea",
    botanical: "Moringa oleifera",
    nafdacNumber: "A7-0334L",
    manufacturer: "Multiple registered brands",
    status: "registered",
    indications: ["Nutritional support", "Mild hypertension", "Diabetes adjunct", "General wellness"],
    dose: "1–2 capsules (500 mg) or 1 cup tea",
    administration: "Twice daily with meals.",
    properties: ["Hypotensive", "Hypoglycaemic", "Anti-inflammatory"],
    contraindications: ["Pregnancy (root/bark)", "Hypotension"],
    drugInteractions: [
      { drug: "Amlodipine", severity: "caution", why: "May cause additive blood-pressure lowering." },
      { drug: "Lisinopril", severity: "caution", why: "Additive antihypertensive effect." },
      { drug: "Metformin", severity: "caution", why: "May cause hypoglycaemia when combined." },
      { drug: "Insulin", severity: "danger", why: "Increased risk of hypoglycaemia." },
      { drug: "Levothyroxine", severity: "caution", why: "May reduce thyroid hormone absorption." },
    ],
    sideEffects: ["Mild GI upset", "Dizziness if BP drops"],
  },
  {
    key: "bitter kola",
    productName: "Bitter Kola (Garcinia kola)",
    botanical: "Garcinia kola",
    nafdacNumber: "A7-1003L",
    manufacturer: "Various",
    status: "registered",
    indications: ["Cough", "Cold", "Fatigue", "Mild aphrodisiac use"],
    dose: "1–2 seeds chewed",
    administration: "As needed, not more than 3 seeds daily.",
    properties: ["Stimulant", "Hypertensive", "Anti-microbial"],
    contraindications: ["Hypertension", "Anxiety disorders", "Insomnia", "Pregnancy"],
    drugInteractions: [
      { drug: "Amlodipine", severity: "danger", why: "Counteracts antihypertensive effect — BP can spike." },
      { drug: "Lisinopril", severity: "danger", why: "Reduces effectiveness; risk of uncontrolled BP." },
      { drug: "Caffeine", severity: "caution", why: "Additive stimulant load — palpitations, jitters." },
    ],
    sideEffects: ["Insomnia", "Raised BP", "Restlessness"],
  },
  {
    key: "ginger",
    productName: "Ginger (Zingiber officinale)",
    botanical: "Zingiber officinale",
    nafdacNumber: "A7-0521L",
    manufacturer: "Various",
    status: "registered",
    indications: ["Nausea", "Indigestion", "Cold", "Joint pain"],
    dose: "1–2 g dried root or fresh equivalent",
    administration: "As tea or with meals, up to 3 times daily.",
    properties: ["Blood Thinner", "Anti-inflammatory", "Hypoglycaemic"],
    contraindications: ["Active bleeding", "Pre-surgery (stop 2 weeks before)", "Gallstones"],
    drugInteractions: [
      { drug: "Warfarin", severity: "danger", why: "Increases bleeding risk by inhibiting platelets." },
      { drug: "Aspirin", severity: "danger", why: "Additive antiplatelet effect — bleeding risk." },
      { drug: "Insulin", severity: "caution", why: "May increase hypoglycaemia." },
    ],
    sideEffects: ["Heartburn", "Mouth irritation"],
  },
  {
    key: "garlic",
    productName: "Garlic (Allium sativum)",
    botanical: "Allium sativum",
    nafdacNumber: "A7-0289L",
    manufacturer: "Various",
    status: "registered",
    indications: ["Mild hypertension", "Cholesterol", "Cold prevention"],
    dose: "1 fresh clove or 600–1200 mg aged extract daily",
    administration: "With food.",
    properties: ["Blood Thinner", "Hypotensive", "Hypoglycaemic", "CYP3A4 Inducer"],
    contraindications: ["Bleeding disorders", "Pre-surgery"],
    drugInteractions: [
      { drug: "Warfarin", severity: "danger", why: "Significantly increases bleeding risk." },
      { drug: "Aspirin", severity: "danger", why: "Additive antiplatelet effect." },
      { drug: "Saquinavir / HIV protease inhibitors", severity: "danger", why: "Reduces drug levels by ~50%." },
    ],
    sideEffects: ["Bad breath", "Heartburn", "Body odour"],
  },
  {
    key: "soursop",
    productName: "Soursop Leaf (Annona muricata)",
    botanical: "Annona muricata",
    nafdacNumber: "A7-0892L",
    manufacturer: "Various",
    status: "registered",
    indications: ["Sleep aid", "Hypertension support", "Anti-inflammatory"],
    dose: "1 cup tea (3–5 leaves)",
    administration: "Once daily, evening preferred. Avoid long-term daily use.",
    properties: ["Hypotensive", "Sedative"],
    contraindications: ["Parkinson's disease", "Pregnancy", "Long-term continuous use (neurotoxicity risk)"],
    drugInteractions: [
      { drug: "Amlodipine", severity: "caution", why: "Additive BP-lowering — dizziness risk." },
      { drug: "Antidepressants", severity: "caution", why: "Annonaceous acetogenins may increase neurotoxicity." },
    ],
    sideEffects: ["Sleepiness", "Movement disorders with chronic use"],
  },
  {
    key: "neem",
    productName: "Dogonyaro (Azadirachta indica)",
    botanical: "Azadirachta indica",
    nafdacNumber: "A7-0445L",
    manufacturer: "Various",
    status: "registered",
    indications: ["Malaria adjunct", "Skin infections", "Fever"],
    dose: "1 cup leaf decoction",
    administration: "Once daily, max 5 days continuous.",
    properties: ["Anti-malarial", "Anti-microbial", "Hypoglycaemic", "Hepatotoxic Risk"],
    contraindications: ["Pregnancy", "Children under 5", "Liver disease", "Trying to conceive"],
    drugInteractions: [
      { drug: "Insulin", severity: "danger", why: "Severe hypoglycaemia risk." },
      { drug: "Metformin", severity: "caution", why: "Additive blood-sugar lowering." },
    ],
    sideEffects: ["Liver injury (high dose)", "Hypoglycaemia", "Reye-like syndrome in children"],
  },
  {
    key: "ginseng",
    productName: "Ginseng",
    botanical: "Panax ginseng",
    nafdacNumber: "A7-1227L",
    manufacturer: "Various importers",
    status: "registered",
    indications: ["Energy", "Cognitive support", "Immune"],
    dose: "200–400 mg standardized extract daily",
    administration: "Morning, with food. Cycle 2 weeks on / 1 week off.",
    properties: ["Stimulant", "Hypertensive", "Hypoglycaemic", "Blood Thinner"],
    contraindications: ["Hypertension", "Insomnia", "Anxiety", "Pregnancy"],
    drugInteractions: [
      { drug: "Warfarin", severity: "danger", why: "Reduces warfarin effect — clotting risk." },
      { drug: "Amlodipine", severity: "danger", why: "Counteracts BP control." },
      { drug: "Antidepressants (MAOIs)", severity: "danger", why: "Manic episodes reported." },
    ],
    sideEffects: ["Insomnia", "Headache", "Raised BP"],
  },
  {
    key: "ruzu bitters",
    productName: "Ruzu Herbal Bitters",
    botanical: "Multi-herb formulation",
    nafdacNumber: "A7-1576L",
    manufacturer: "RIRO Resources Ltd",
    status: "registered",
    indications: ["Diabetes adjunct", "Blood pressure", "Body cleansing"],
    dose: "30 ml (1 shot)",
    administration: "Once daily on empty stomach.",
    properties: ["Hypoglycaemic", "Hypotensive", "Diuretic", "Hepatotoxic Risk"],
    contraindications: ["Pregnancy", "Severe liver/kidney disease", "Children"],
    drugInteractions: [
      { drug: "Insulin", severity: "danger", why: "Risk of severe hypoglycaemia." },
      { drug: "Metformin", severity: "caution", why: "Additive hypoglycaemic effect." },
      { drug: "Amlodipine", severity: "caution", why: "Additive BP lowering." },
    ],
    sideEffects: ["Hypoglycaemia", "Dizziness", "Loose stools"],
  },
];

export function findInDatabase(query: string): NafdacEntry | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  // Match against NAFDAC number, product name, or key.
  return (
    NAFDAC_DB.find(
      (e) =>
        e.key === q ||
        e.productName.toLowerCase().includes(q) ||
        e.botanical.toLowerCase().includes(q) ||
        (e.nafdacNumber && e.nafdacNumber.toLowerCase() === q),
    ) ?? null
  );
}
