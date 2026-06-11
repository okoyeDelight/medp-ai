// Bridge user-facing Pidgin / colloquial symptom phrases to standardised
// medical terminology shown on the Clinical Desk.
//
// Heuristic match: we lowercase the input and look for any of the keys as
// substrings, preferring the longest match.

export interface SymptomBridge {
  pidgin: string;
  medical: string;
  category: string;
  triage: "routine" | "urgent" | "emergent";
}

export const PIDGIN_SYMPTOM_MAP: SymptomBridge[] = [
  { pidgin: "Body dey hot",            medical: "Pyrexia / Suspected malaria", category: "Infectious",   triage: "urgent" },
  { pidgin: "Body dey shake",          medical: "Rigors / Febrile chills",     category: "Infectious",   triage: "urgent" },
  { pidgin: "Belle dey pain",          medical: "Abdominal pain / Gastritis",  category: "GI",           triage: "routine" },
  { pidgin: "Belle dey run",           medical: "Acute diarrhoea",             category: "GI",           triage: "urgent" },
  { pidgin: "I dey purge",             medical: "Acute diarrhoea",             category: "GI",           triage: "urgent" },
  { pidgin: "I dey vomit",             medical: "Emesis",                      category: "GI",           triage: "urgent" },
  { pidgin: "Head dey turn",           medical: "Vertigo / Dizziness",         category: "Neuro",        triage: "routine" },
  { pidgin: "Head dey bang",           medical: "Cephalgia",                   category: "Neuro",        triage: "routine" },
  { pidgin: "Body weak",               medical: "Generalised asthenia",        category: "Constitutional", triage: "routine" },
  { pidgin: "Body don tire",           medical: "Fatigue",                     category: "Constitutional", triage: "routine" },
  { pidgin: "Heart dey beat fast",     medical: "Tachycardia / Palpitations",  category: "Cardiac",      triage: "emergent" },
  { pidgin: "Chest dey pain",          medical: "Chest pain — rule out ACS",   category: "Cardiac",      triage: "emergent" },
  { pidgin: "I no fit breathe well",   medical: "Dyspnoea",                    category: "Respiratory",  triage: "emergent" },
  { pidgin: "Cough dey worry me",      medical: "Persistent cough",            category: "Respiratory",  triage: "routine" },
  { pidgin: "Eye dey yellow",          medical: "Scleral icterus / Jaundice",  category: "Hepatic",      triage: "urgent" },
  { pidgin: "Urine dey dark",          medical: "Dark urine — assess hepatic/renal", category: "Renal",  triage: "urgent" },
  { pidgin: "Sugar dey worry me",      medical: "Suspected hyperglycaemia",    category: "Endocrine",    triage: "urgent" },
  { pidgin: "BP high",                 medical: "Elevated blood pressure",     category: "Cardiac",      triage: "urgent" },
  { pidgin: "better",                  medical: "Symptom improving",           category: "Trend",        triage: "routine" },
  { pidgin: "same",                    medical: "No interval change",          category: "Trend",        triage: "routine" },
  { pidgin: "worse",                   medical: "Symptom worsening",           category: "Trend",        triage: "urgent" },
];

export function bridgeSymptom(raw: string | null | undefined): SymptomBridge | null {
  if (!raw) return null;
  const text = raw.toLowerCase().trim();
  if (!text) return null;
  const matches = PIDGIN_SYMPTOM_MAP.filter((s) => text.includes(s.pidgin.toLowerCase()));
  if (matches.length === 0) {
    // last-resort: direct equality with "better/same/worse" feel tags
    return PIDGIN_SYMPTOM_MAP.find((s) => s.pidgin.toLowerCase() === text) ?? null;
  }
  return matches.sort((a, b) => b.pidgin.length - a.pidgin.length)[0];
}

export function triageColor(t: SymptomBridge["triage"]): string {
  switch (t) {
    case "emergent": return "bg-[hsl(var(--danger))] text-[hsl(var(--danger-foreground))]";
    case "urgent":   return "bg-[hsl(var(--caution))] text-[hsl(var(--caution-foreground))]";
    default:         return "bg-[hsl(var(--safe))] text-[hsl(var(--safe-foreground))]";
  }
}
