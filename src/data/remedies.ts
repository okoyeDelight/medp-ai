export type Severity = "red" | "yellow" | "green";

export interface Interaction {
  drug: string;
  level: Severity;
  why: string;
}

export interface PrepStep {
  text: string;
  unit?: "sachet" | "eva" | "spoon" | "leaf" | "fire" | "cup";
  qty?: number;
}

export interface Remedy {
  id: string;
  name: string;
  localName: string;
  treats: string[]; // symptom keys
  blurb: string; // pidgin one-liner
  imageHint: string; // alt text for plant photo
  emoji: string;
  prep: PrepStep[];
  dose: string; // pidgin
  intervalHours: number;
  interactions: Interaction[];
  warning?: string;
}

export interface SymptomChip {
  key: string;
  label: string; // pidgin
  emoji: string;
}

export const SYMPTOMS: SymptomChip[] = [
  { key: "malaria", label: "Body dey hot (Malaria)", emoji: "🥵" },
  { key: "stomach", label: "Belle dey pain me", emoji: "🤕" },
  { key: "cough", label: "I dey cough", emoji: "😮‍💨" },
  { key: "cold", label: "Catarrh & cold", emoji: "🤧" },
  { key: "headache", label: "Head dey bang", emoji: "🤯" },
  { key: "diarrhea", label: "Belle dey run", emoji: "🚽" },
  { key: "wound", label: "Cut / wound", emoji: "🩹" },
  { key: "bp", label: "High BP wahala", emoji: "💢" },
];

export const REMEDIES: Remedy[] = [
  {
    id: "dogonyaro",
    name: "Neem Leaf",
    localName: "Dogonyaro",
    treats: ["malaria", "headache"],
    blurb: "Dogonyaro dey chase malaria comot for body, but e bitter no be small.",
    imageHint: "Fresh neem (dogonyaro) leaves",
    emoji: "🌿",
    prep: [
      { text: "Wash fresh dogonyaro leaves well well", qty: 10, unit: "leaf" },
      { text: "Boil for clean water for 15 minutes", qty: 2, unit: "sachet" },
      { text: "Allow am cool small, sieve am inside cup", qty: 1, unit: "cup" },
    ],
    dose: "Drink half cup, morning and night",
    intervalHours: 12,
    interactions: [
      { drug: "Coartem", level: "yellow", why: "E fit make you weak too much. Space dem 2 hours apart." },
      { drug: "Insulin", level: "red", why: "Dogonyaro dey drop sugar — sugar fit crash." },
      { drug: "Paracetamol", level: "green", why: "Dem fit follow body, no wahala." },
    ],
    warning: "Pregnant women: NO TOUCH AM.",
  },
  {
    id: "ginger",
    name: "Ginger Root",
    localName: "Atale / Chita",
    treats: ["stomach", "cough", "cold"],
    blurb: "Ginger dey warm belle, kill catarrh, and clear chest.",
    imageHint: "Fresh ginger root",
    emoji: "🫚",
    prep: [
      { text: "Peel and slice small ginger", qty: 1, unit: "spoon" },
      { text: "Pour hot water for cup, cover am 5 min", qty: 1, unit: "eva" },
      { text: "Add small honey if you get", qty: 1, unit: "spoon" },
    ],
    dose: "One full cup, three times for day",
    intervalHours: 8,
    interactions: [
      { drug: "Aspirin", level: "yellow", why: "Both fit thin blood — watch am if you get cut." },
      { drug: "Warfarin", level: "red", why: "Serious bleeding fit happen. NO MIX." },
      { drug: "Amoxicillin", level: "green", why: "Safe to follow body." },
    ],
  },
  {
    id: "bitterleaf",
    name: "Bitter Leaf",
    localName: "Ewuro / Onugbu",
    treats: ["malaria", "stomach", "bp"],
    blurb: "Bitterleaf juice dey clean system, but e bitter pass agbalumo seed.",
    imageHint: "Fresh bitter leaf bunch",
    emoji: "🍃",
    prep: [
      { text: "Squeeze fresh bitterleaf for clean water", qty: 6, unit: "leaf" },
      { text: "Sieve the green juice comot", qty: 1, unit: "sachet" },
      { text: "Drink am sharp sharp, no chase with sugar", qty: 1, unit: "cup" },
    ],
    dose: "Half Eva bottle, once a day for 3 days",
    intervalHours: 24,
    interactions: [
      { drug: "Lisinopril (BP drug)", level: "red", why: "BP fit drop too low. Avoid am." },
      { drug: "Metformin", level: "yellow", why: "Sugar fit drop — chop something first." },
      { drug: "Vitamin C", level: "green", why: "Dem dey work together fine." },
    ],
  },
  {
    id: "lemongrass",
    name: "Lemon Grass",
    localName: "Ewe tea / Kooko oba",
    treats: ["malaria", "cold", "headache"],
    blurb: "Lemongrass tea dey sweat malaria comot, smell sef dey clear nose.",
    imageHint: "Bundle of lemon grass stalks",
    emoji: "🌾",
    prep: [
      { text: "Roll fresh lemongrass, tie am", qty: 5, unit: "leaf" },
      { text: "Boil with two sachets pure water", qty: 2, unit: "sachet" },
      { text: "Cover head with wrapper, inhale steam 5 min", qty: 1, unit: "fire" },
    ],
    dose: "Drink one cup hot, morning and evening",
    intervalHours: 12,
    interactions: [
      { drug: "Sleeping pills", level: "yellow", why: "E fit make you sleep pass." },
      { drug: "Paracetamol", level: "green", why: "Safe combo." },
    ],
  },
  {
    id: "garlic",
    name: "Garlic",
    localName: "Ayuu / Ayo",
    treats: ["bp", "cold", "cough"],
    blurb: "Garlic dey calm BP, fight catarrh, but mouth go smell small.",
    imageHint: "Garlic bulbs and cloves",
    emoji: "🧄",
    prep: [
      { text: "Crush fresh garlic small", qty: 2, unit: "spoon" },
      { text: "Mix with warm water or honey", qty: 1, unit: "cup" },
      { text: "Swallow am quick, drink water on top", qty: 1, unit: "eva" },
    ],
    dose: "One spoon, two times daily",
    intervalHours: 12,
    interactions: [
      { drug: "Warfarin", level: "red", why: "Serious bleeding risk." },
      { drug: "HIV ARVs", level: "red", why: "Garlic fit reduce ARV strength." },
      { drug: "Paracetamol", level: "green", why: "No wahala." },
    ],
  },
  {
    id: "scentleaf",
    name: "Scent Leaf",
    localName: "Efinrin / Nchanwu",
    treats: ["stomach", "diarrhea", "cold"],
    blurb: "Efinrin dey settle belle, kill germ for inside food.",
    imageHint: "Scent leaf (efinrin) bunch",
    emoji: "🌱",
    prep: [
      { text: "Wash scent leaves clean", qty: 8, unit: "leaf" },
      { text: "Boil 10 minutes for pure water", qty: 1, unit: "sachet" },
      { text: "Sieve and drink am warm", qty: 1, unit: "cup" },
    ],
    dose: "Half Eva bottle, three times a day",
    intervalHours: 8,
    interactions: [
      { drug: "Flagyl (Metronidazole)", level: "green", why: "Dem dey work together well." },
      { drug: "Diabetic drugs", level: "yellow", why: "Watch your sugar level." },
    ],
  },
  {
    id: "aloe",
    name: "Aloe Vera",
    localName: "Eti erin",
    treats: ["wound", "stomach"],
    blurb: "Aloe gel dey cool burn, heal wound sharp sharp.",
    imageHint: "Aloe vera leaf cut open showing gel",
    emoji: "🪴",
    prep: [
      { text: "Cut one fresh aloe leaf", qty: 1, unit: "leaf" },
      { text: "Scoop the clear gel comot", qty: 1, unit: "spoon" },
      { text: "Rub am for the wound or cut", qty: 1, unit: "cup" },
    ],
    dose: "Apply 2-3 times daily till e dry",
    intervalHours: 6,
    interactions: [
      { drug: "Diabetic drugs", level: "yellow", why: "If you swallow am, sugar fit drop." },
      { drug: "Iodine antiseptic", level: "green", why: "You fit use the two for wound." },
    ],
  },
  {
    id: "mango-bark",
    name: "Mango Bark",
    localName: "Epo Mongoro",
    treats: ["diarrhea", "stomach"],
    blurb: "Mango bark dey hold belle wey dey run.",
    imageHint: "Strip of mango tree bark",
    emoji: "🥭",
    prep: [
      { text: "Wash small mango bark well well", qty: 1, unit: "leaf" },
      { text: "Boil with two sachets water 20 min", qty: 2, unit: "sachet" },
      { text: "Cool am, drink the brown water", qty: 1, unit: "cup" },
    ],
    dose: "Quarter Eva bottle, two times daily",
    intervalHours: 12,
    interactions: [
      { drug: "Loperamide (Imodium)", level: "yellow", why: "Pick one, no use both." },
      { drug: "ORS", level: "green", why: "Drink ORS plenty — e dey help." },
    ],
    warning: "If belle still dey run after 24 hours, see Pharmacist.",
  },
];

export function findRemediesFor(symptomKeys: string[]): Remedy[] {
  if (symptomKeys.length === 0) return [];
  return REMEDIES.filter((r) => r.treats.some((t) => symptomKeys.includes(t)));
}

export function matchSymptomsFromText(text: string): string[] {
  const t = text.toLowerCase();
  const map: Record<string, string[]> = {
    malaria: ["malaria", "body hot", "fever", "shiver", "cold body"],
    stomach: ["belle", "stomach", "tommy", "ulcer", "gas"],
    cough: ["cough", "chest"],
    cold: ["catarrh", "cold", "nose", "sneeze"],
    headache: ["head", "headache", "migraine", "bang"],
    diarrhea: ["run belle", "diarrhea", "running stomach", "purge", "shit"],
    wound: ["wound", "cut", "burn", "sore"],
    bp: ["bp", "pressure", "hypertension"],
  };
  const hits: string[] = [];
  for (const [k, words] of Object.entries(map)) {
    if (words.some((w) => t.includes(w))) hits.push(k);
  }
  return hits;
}
