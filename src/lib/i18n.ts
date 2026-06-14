// Minimal English ↔ Nigerian Pidgin label dictionary for the telepharmacy UI.
export type UiLang = "en" | "pcm";

export const STRINGS: Record<UiLang, Record<string, string>> = {
  en: {
    findChemist: "Find a Chemist",
    findChemistSub: "Verified pharmacists currently on duty near you",
    online: "On duty",
    offline: "Off duty",
    distanceAway: "{km} km away",
    chatWithPharmacist: "Chat with Pharmacist",
    noPharmacies: "No pharmacists are online near you right now.",
    starting: "Starting secure consultation…",
    yourLocation: "Your location",
    languageToggle: "Pidgin",
    typeMessage: "Type your message…",
    send: "Send",
    endConsultation: "End Consultation & File Record",
    waitingForPharmacist: "Ringing the pharmacist… please wait.",
    consultationEnded: "Consultation ended and saved to your medical history.",
    secureChannel: "Secure medical channel — encrypted, private to you and the pharmacist.",
  },
  pcm: {
    findChemist: "Find Chemist",
    findChemistSub: "Real pharmacists wey dey on duty near you",
    online: "Dey work",
    offline: "No dey",
    distanceAway: "{km} km from you",
    chatWithPharmacist: "Talk to Pharmacist",
    noPharmacies: "No pharmacist dey online near you now.",
    starting: "Dey start your private chat…",
    yourLocation: "Where you dey",
    languageToggle: "English",
    typeMessage: "Type wetin you wan talk…",
    send: "Send",
    endConsultation: "End Talk & Save Record",
    waitingForPharmacist: "Dey ring the pharmacist… hold small.",
    consultationEnded: "Talk don end. We don save am for your medical record.",
    secureChannel: "Secure line — na only you and the pharmacist fit see this.",
  },
};

export function t(lang: UiLang, key: string, vars?: Record<string, string | number>) {
  let s = STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}
