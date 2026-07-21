import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "en" | "pcm" | "ig" | "yo" | "ha";

export const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "en",  label: "English",   flag: "🇬🇧" },
  { code: "pcm", label: "Pidgin",    flag: "🇳🇬" },
  { code: "ig",  label: "Igbo",      flag: "🇳🇬" },
  { code: "yo",  label: "Yoruba",    flag: "🇳🇬" },
  { code: "ha",  label: "Hausa",     flag: "🇳🇬" },
];

type Dict = Record<string, string>;
const DICTS: Record<Lang, Dict> = {
  en: {
    "app.tagline": "Your pocket chemist",
    "workspace.select": "Select workspace",
    "workspace.patient": "Patient",
    "workspace.patient.desc": "Track vitals, log doses, see a doctor.",
    "workspace.clinical": "Clinical Desk",
    "workspace.clinical.desc": "Live triage queue and consultations.",
    "workspace.continue": "Continue",
    "triage.title": "See a Doctor",
    "triage.subtitle": "Secure clinical triage · end-to-end private",
    "triage.start": "Enter the waiting room",
    "triage.intake.age": "Age",
    "triage.intake.gender": "Gender",
    "triage.intake.symptom": "What is bothering you?",
    "triage.intake.symptom.hint": "Only a general category is shared with the doctor.",
    "triage.waiting": "Waiting for a doctor to accept your case",
    "triage.waiting.desc": "Your name and detailed record are NOT visible. Doctors only see age, gender, and category.",
    "triage.cancel": "Cancel triage",
    "triage.request.title": "A doctor is requesting your consult",
    "triage.request.body": "Dr. {name}, MDCN #{license} is ready for your consultation. Accepting will unlock your medical context for this doctor only.",
    "triage.accept": "Accept",
    "triage.decline": "Decline",
    "desk.title": "Live Triage Command Center",
    "desk.queue": "Live patient queue",
    "desk.queue.empty": "No patients waiting. Queue updates live.",
    "desk.request": "Request connection",
    "desk.requested": "Waiting for patient…",
    "desk.consult": "Open consultation",
    "desk.myactive": "My active consultations",
    "desk.conclude": "Conclude consultation",
    "followup.title": "Follow-up tickets",
    "followup.none": "No follow-up tickets.",
    "followup.expires": "Expires",
    "followup.redeem": "Start follow-up",
    "followup.issue": "Issue 72-hour follow-up ticket",
    "followup.issued": "72-hour follow-up ticket issued to patient.",
    "provider.portal": "Provider Portal",
    "lang.label": "Language",
  },
  pcm: {
    "app.tagline": "Your pocket chemist",
    "workspace.select": "Choose workspace",
    "workspace.patient": "Patient",
    "workspace.patient.desc": "Check body, log dose, see doctor.",
    "workspace.clinical": "Clinical Desk",
    "workspace.clinical.desc": "Live patient queue and consult.",
    "workspace.continue": "Continue",
    "triage.title": "See Doctor",
    "triage.subtitle": "Secure triage · private end-to-end",
    "triage.start": "Enter waiting room",
    "triage.intake.age": "Age",
    "triage.intake.gender": "Gender",
    "triage.intake.symptom": "Wetin dey worry you?",
    "triage.intake.symptom.hint": "Na only general category doctor go see.",
    "triage.waiting": "Dey wait make doctor accept your case",
    "triage.waiting.desc": "Your name and file no dey show. Doctor only see age, gender and category.",
    "triage.cancel": "Cancel triage",
    "triage.request.title": "One doctor wan see you",
    "triage.request.body": "Dr. {name}, MDCN #{license} ready to consult you. If you accept, na only am go see your medical info.",
    "triage.accept": "Accept",
    "triage.decline": "Decline",
    "desk.title": "Live Triage Command Center",
    "desk.queue": "Live patient queue",
    "desk.queue.empty": "No patient dey wait. Queue dey update live.",
    "desk.request": "Request connection",
    "desk.requested": "Dey wait patient…",
    "desk.consult": "Open consult",
    "desk.myactive": "My active consults",
    "desk.conclude": "Finish consult",
    "followup.title": "Follow-up tickets",
    "followup.none": "No ticket.",
    "followup.expires": "E go expire",
    "followup.redeem": "Start follow-up",
    "followup.issue": "Give 72-hour follow-up ticket",
    "followup.issued": "72-hour ticket don reach patient.",
    "provider.portal": "Provider Portal",
    "lang.label": "Language",
  },
  ig: {
    "app.tagline": "Onye ọgwụ gị nkịtị",
    "workspace.select": "Họrọ ọrụ",
    "workspace.patient": "Onye ọrịa",
    "workspace.patient.desc": "Lekọta ahụ, dekọba ọgwụ, hụ dọkịta.",
    "workspace.clinical": "Ụlọ Ọgwụ",
    "workspace.clinical.desc": "Ndepụta ndị ọrịa na nkwurịta.",
    "workspace.continue": "Gaa n'ihu",
    "triage.title": "Hụ Dọkịta",
    "triage.subtitle": "Nyocha nzuzo",
    "triage.start": "Banye ime nchere",
    "triage.intake.age": "Afọ",
    "triage.intake.gender": "Nwoke/Nwaanyị",
    "triage.intake.symptom": "Kedu ihe na-eme gị?",
    "triage.intake.symptom.hint": "Naanị ụdị izugbe ka a na-ekere.",
    "triage.waiting": "Na-eche dọkịta ịnabata okwu gị",
    "triage.waiting.desc": "Aha na akwụkwọ gị apụtaghị. Naanị afọ, nwoke/nwaanyị na ụdị.",
    "triage.cancel": "Kagbuo",
    "triage.request.title": "Dọkịta chọrọ ịhụ gị",
    "triage.request.body": "Dọkịta {name}, MDCN #{license} dị njikere. Ọ bụrụ na ịnabata, ọ ga-ahụ akwụkwọ ahụ gị.",
    "triage.accept": "Nabata",
    "triage.decline": "Jụ",
    "desk.title": "Ụlọ Ọrụ Triage",
    "desk.queue": "Ndepụta ndị ọrịa",
    "desk.queue.empty": "Ọ dịghị onye na-eche.",
    "desk.request": "Rịọ njikọ",
    "desk.requested": "Na-eche onye ọrịa…",
    "desk.consult": "Mepee nkwurịta",
    "desk.myactive": "Nkwurịta m",
    "desk.conclude": "Kwụsị nkwurịta",
    "followup.title": "Tikiti nlele ọzọ",
    "followup.none": "Enweghị tikiti.",
    "followup.expires": "Ga-akwụsị",
    "followup.redeem": "Malite nlele",
    "followup.issue": "Nye tikiti awa 72",
    "followup.issued": "E nyere tikiti awa 72.",
    "provider.portal": "Portal Dọkịta",
    "lang.label": "Asụsụ",
  },
  yo: {
    "app.tagline": "Onísègùn àpò rẹ",
    "workspace.select": "Yan iṣẹ́",
    "workspace.patient": "Aláìsàn",
    "workspace.patient.desc": "Ṣàyẹ̀wò ara, kọ oògùn, rí dókítà.",
    "workspace.clinical": "Ẹ̀ka Ilé Ìwòsàn",
    "workspace.clinical.desc": "Ìlà aláìsàn tí ó ń lọ pẹ̀lú ìjìròrò.",
    "workspace.continue": "Tẹ̀síwájú",
    "triage.title": "Rí Dókítà",
    "triage.subtitle": "Triage tí ó ní ààbò",
    "triage.start": "Wọ iyàrá ìdúró",
    "triage.intake.age": "Ọjọ́ orí",
    "triage.intake.gender": "Ọkùnrin/Obìnrin",
    "triage.intake.symptom": "Kí ni ń dààmú rẹ?",
    "triage.intake.symptom.hint": "Ẹ̀ka gbogbogbò nìkan ni a fi ránṣẹ́.",
    "triage.waiting": "N dúró de dókítà",
    "triage.waiting.desc": "Orúkọ àti fáìlì rẹ kò hàn.",
    "triage.cancel": "Fagilé",
    "triage.request.title": "Dókítà kan ń béèrè fún ọ",
    "triage.request.body": "Dr. {name}, MDCN #{license} ti ṣetán. Bí o bá gba, òun nìkan ni yóò rí ìwé ìwòsàn rẹ.",
    "triage.accept": "Gbà",
    "triage.decline": "Kọ̀",
    "desk.title": "Ilé Ìṣẹ́ Triage Alààyè",
    "desk.queue": "Ìlà aláìsàn",
    "desk.queue.empty": "Kò sí aláìsàn.",
    "desk.request": "Béèrè fún ìsopọ̀",
    "desk.requested": "N dúró de aláìsàn…",
    "desk.consult": "Ṣí ìjìròrò",
    "desk.myactive": "Ìjìròrò tí ń lọ",
    "desk.conclude": "Parí ìjìròrò",
    "followup.title": "Tíkẹ́ẹ̀tì ìtẹ̀síwájú",
    "followup.none": "Kò sí tíkẹ́ẹ̀tì.",
    "followup.expires": "Yóò parí",
    "followup.redeem": "Bẹ̀rẹ̀ ìtẹ̀síwájú",
    "followup.issue": "Fúnni ní tíkẹ́ẹ̀tì wákàtí 72",
    "followup.issued": "Tíkẹ́ẹ̀tì ti dé ọ̀dọ̀ aláìsàn.",
    "provider.portal": "Portal Dókítà",
    "lang.label": "Èdè",
  },
  ha: {
    "app.tagline": "Likitan aljihunka",
    "workspace.select": "Zaɓi wurin aiki",
    "workspace.patient": "Majinyaci",
    "workspace.patient.desc": "Bincika jiki, rubuta magani, ga likita.",
    "workspace.clinical": "Sashen Asibiti",
    "workspace.clinical.desc": "Jerin majinyata da tuntuɓa.",
    "workspace.continue": "Ci gaba",
    "triage.title": "Ga Likita",
    "triage.subtitle": "Amintacce, sirri",
    "triage.start": "Shiga ɗakin jira",
    "triage.intake.age": "Shekaru",
    "triage.intake.gender": "Namiji/Mace",
    "triage.intake.symptom": "Menene yake damunka?",
    "triage.intake.symptom.hint": "Kawai rukuni na gabaɗaya ake tura wa likita.",
    "triage.waiting": "Ana jira likita ya karɓi shari'arka",
    "triage.waiting.desc": "Suna da fayil ba a nunawa.",
    "triage.cancel": "Soke",
    "triage.request.title": "Likita yana neman ganin ka",
    "triage.request.body": "Dr. {name}, MDCN #{license} ya shirya. Idan ka amince, shi kaɗai zai ga bayanin lafiyarka.",
    "triage.accept": "Amince",
    "triage.decline": "Ƙi",
    "desk.title": "Cibiyar Umarni ta Triage",
    "desk.queue": "Jerin majinyata kai tsaye",
    "desk.queue.empty": "Babu majinyaci a jira.",
    "desk.request": "Nemi haɗi",
    "desk.requested": "Ana jira majinyaci…",
    "desk.consult": "Buɗe tuntuɓa",
    "desk.myactive": "Tuntuɓa mai aiki",
    "desk.conclude": "Kammala tuntuɓa",
    "followup.title": "Katunan bibiya",
    "followup.none": "Babu katin.",
    "followup.expires": "Zai ƙare",
    "followup.redeem": "Fara bibiya",
    "followup.issue": "Ba da katin bibiya na sa'o'i 72",
    "followup.issued": "An aika katin sa'o'i 72.",
    "provider.portal": "Portal na Likita",
    "lang.label": "Harshe",
  },
};

interface Ctx { lang: Lang; setLang: (l: Lang) => void; t: (key: string, vars?: Record<string,string|number>) => string }
const I18nCtx = createContext<Ctx | null>(null);

const LS_KEY = "medp.lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem(LS_KEY) as Lang) || "en");
  useEffect(() => { localStorage.setItem(LS_KEY, lang); document.documentElement.lang = lang; }, [lang]);
  const value = useMemo<Ctx>(() => ({
    lang,
    setLang: setLangState,
    t: (key, vars) => {
      const raw = DICTS[lang]?.[key] ?? DICTS.en[key] ?? key;
      if (!vars) return raw;
      return raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
    },
  }), [lang]);
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nCtx);
  if (!ctx) return { lang: "en", setLang: () => {}, t: (k) => DICTS.en[k] ?? k };
  return ctx;
}

// Compact sticky dropdown
import { Check, Globe } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();
  const active = LANGS.find((l) => l.code === lang) ?? LANGS[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={
          "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-2.5 py-1.5 text-xs font-medium hover:bg-muted " +
          className
        }
        aria-label="Language"
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="uppercase">{active.code}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {LANGS.map((l) => (
          <DropdownMenuItem key={l.code} onClick={() => setLang(l.code)} className="justify-between">
            <span>{l.flag} {l.label}</span>
            {l.code === lang && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
