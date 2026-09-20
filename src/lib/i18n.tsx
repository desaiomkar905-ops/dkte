"use client";

/**
 * Lightweight i18n for the demo: English, Hindi, Marathi.
 * Architecture is extensible — add a language by extending LANGS and DICT.
 * (Full-page machine translation is a documented extension; the AI pipeline
 * already accepts the complaint language.)
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const LANGS = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "mr", label: "मराठी" },
] as const;

export type LangCode = (typeof LANGS)[number]["code"];

const DICT: Record<LangCode, Record<string, string>> = {
  en: {
    tagline: "From Citizen Complaint to Verified Civic Action",
    reportIssue: "Report an Issue",
    myComplaints: "My Complaints",
    dashboard: "Official Dashboard",
    workerTasks: "My Tasks",
    login: "Sign in",
    register: "Create account",
    logout: "Sign out",
    submit: "Submit complaint",
    takePhoto: "Take / choose photo",
    describe: "Describe the issue",
    useLocation: "Use my location",
    recordVoice: "Record voice complaint",
    stop: "Stop",
    listening: "Listening…",
    language: "Complaint language",
    priority: "Priority",
    severity: "Severity",
    status: "Status",
    department: "Department",
    sla: "SLA",
    created: "Created",
    agentActivity: "Agent Activity",
    timeline: "Timeline",
    evidence: "Resolution Evidence",
    verifyNote: "AI verifies the repair — a worker's claim alone never closes a case.",
    demoData: "Demo data",
    assigned: "Assigned",
    overdue: "Overdue",
    escalated: "Escalated",
    resolved: "Resolved",
    reopen: "Reopened",
  },
  hi: {
    tagline: "नागरिक शिकायत से सत्यापित नागरिक कार्रवाई तक",
    reportIssue: "शिकायत दर्ज करें",
    myComplaints: "मेरी शिकायतें",
    dashboard: "अधिकारी डैशबोर्ड",
    workerTasks: "मेरे कार्य",
    login: "साइन इन",
    register: "खाता बनाएं",
    logout: "साइन आउट",
    submit: "शिकायत भेजें",
    takePhoto: "फ़ोटो लें / चुनें",
    describe: "समस्या का वर्णन करें",
    useLocation: "मेरा स्थान उपयोग करें",
    recordVoice: "आवाज़ से शिकायत दर्ज करें",
    stop: "रोकें",
    listening: "सुन रहे हैं…",
    language: "शिकायत की भाषा",
    priority: "प्राथमिकता",
    severity: "गंभीरता",
    status: "स्थिति",
    department: "विभाग",
    sla: "एसएलए",
    created: "बनाया गया",
    agentActivity: "एजेंट गतिविधि",
    timeline: "टाइमलाइन",
    evidence: "समाधान का प्रमाण",
    verifyNote: "AI मरम्मत की पुष्टि करता है — केवल वर्कर का दावा केस बंद नहीं करता।",
    demoData: "डेमो डेटा",
    assigned: "सौंपा गया",
    overdue: "विलंबित",
    escalated: "उन्नत",
    resolved: "हल हो गया",
    reopen: "फिर खोला गया",
  },
  mr: {
    tagline: "नागरिक तक्रारीपासून पडताळलेल्या कार्यवाहीपर्यंत",
    reportIssue: "तक्रार नोंदवा",
    myComplaints: "माझ्या तक्रारी",
    dashboard: "अधिकारी डॅशबोर्ड",
    workerTasks: "माझी कामे",
    login: "साइन इन",
    register: "खाते तयार करा",
    logout: "साइन आउट",
    submit: "तक्रार पाठवा",
    takePhoto: "फोटो घ्या / निवडा",
    describe: "समस्येचे वर्णन करा",
    useLocation: "माझे स्थान वापरा",
    recordVoice: "आवाजातून तक्रार नोंदवा",
    stop: "थांबा",
    listening: "ऐकत आहोत…",
    language: "तक्रारीची भाषा",
    priority: "प्राधान्यक्रम",
    severity: "गंभीरता",
    status: "स्थिती",
    department: "विभाग",
    sla: "एसएलए",
    created: "तयार",
    agentActivity: "एजंट क्रियाकलाप",
    timeline: "टाइमलाइन",
    evidence: "निराकरणाचा पुरावा",
    verifyNote: "AI दुरुस्तीची पडताळणी करते — फक्त कर्मचाऱ्याचा दावा केस बंद करत नाही.",
    demoData: "डेमो डेटा",
    assigned: "सोपवले",
    overdue: "उशीर",
    escalated: "वरच्या पातळीत",
    resolved: "निकाली",
    reopen: "पुन्हा उघडले",
  },
};

const LangCtx = createContext<{ lang: LangCode; setLang: (l: LangCode) => void; t: (k: string) => string }>({
  lang: "en",
  setLang: () => {},
  t: (k) => DICT.en[k] ?? k,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en");
  useEffect(() => {
    const t = setTimeout(() => {
      const saved = window.localStorage.getItem("cs_lang") as LangCode | null;
      if (saved && LANGS.some((l) => l.code === saved)) setLangState(saved);
    }, 0);
    return () => clearTimeout(t);
  }, []);
  const setLang = (l: LangCode) => {
    setLangState(l);
    window.localStorage.setItem("cs_lang", l);
  };
  const t = (k: string) => DICT[lang][k] ?? DICT.en[k] ?? k;
  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}

export function useLang() {
  return useContext(LangCtx);
}
