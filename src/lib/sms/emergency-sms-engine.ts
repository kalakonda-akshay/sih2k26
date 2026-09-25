/**
 * Emergency SMS Automation Engine
 *
 * Provides:
 * 1. Multi-language SMS template generation (Hindi, Assamese, Manipuri, Mizo, Nepali, etc.)
 * 2. Strict daily quota tracking (100 SMS/day limit for sender 9390093424)
 * 3. Emergency contact directory management with language preferences
 * 4. Dispatch handlers: Direct native SMS (`sms:` protocol), TextBee Android gateway, and WhatsApp fallback
 */

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  role: string;
  language: string;
  district?: string;
  enabled: boolean;
}

export interface SmsLogEntry {
  id: string;
  timestamp: number;
  sender: string;
  recipient: string;
  recipientName: string;
  language: string;
  message: string;
  status: "sent" | "delivered" | "limit_reached" | "failed";
  method: "direct_sms" | "android_gateway" | "whatsapp_fallback" | "simulated";
}

export interface SmsQuotaSettings {
  senderPhone: string;
  dailyLimit: number;
  usedToday: number;
  lastResetDate: string; // YYYY-MM-DD
  autoDispatchOnCritical: boolean;
  gatewayType: "direct_phone" | "textbee" | "simulation";
  textbeeApiKey?: string;
  textbeeDeviceId?: string;
}

export const DEFAULT_SENDER_NUMBER = "9390093424";
export const DEFAULT_DAILY_LIMIT = 100;

export const INITIAL_EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    id: "c1",
    name: "Emergency Officer 1",
    phone: "+91 63817 61164",
    role: "Lead Convoy / Field Unit",
    language: "hi", // Hindi
    district: "East Jaintia Hills",
    enabled: true,
  },
  {
    id: "c2",
    name: "Emergency Officer 2",
    phone: "+91 85819 20151",
    role: "Route Patrol Commander",
    language: "as", // Assamese
    district: "Cachar",
    enabled: true,
  },
  {
    id: "c3",
    name: "Emergency Officer 3",
    phone: "+91 866 801 6114",
    role: "Logistics Escort Lead",
    language: "mni", // Manipuri (Meitei)
    district: "Imphal West",
    enabled: true,
  },
  {
    id: "c4",
    name: "Emergency Officer 4",
    phone: "+91 6281 502 760",
    role: "Corridor Response Team",
    language: "lus", // Mizo
    district: "Aizawl",
    enabled: true,
  },
  {
    id: "c5",
    name: "Emergency Officer 5",
    phone: "+91 90258 60571",
    role: "Medical Relief Escort",
    language: "ne", // Nepali
    district: "East Sikkim",
    enabled: true,
  },
  {
    id: "c6",
    name: "Emergency Officer 6",
    phone: "+91 79975 31024",
    role: "Rapid Response Dispatcher",
    language: "hi", // Hindi
    district: "Kamrup Metropolitan",
    enabled: true,
  },
  {
    id: "c7",
    name: "Akshay (Ops Controller)",
    phone: "+91 93900 93424",
    role: "NER Incident Command Base",
    language: "en", // English
    district: "NER Central",
    enabled: true,
  },
];

export interface EmergencyAlertPayload {
  title: string;
  severity: "critical" | "major" | "elevated" | "none" | "high" | "medium" | "low";
  locationName: string;
  district?: string;
  recommendedAction: string;
  roadNumber?: string;
}

const EMERGENCY_PREFIX: Record<string, string> = {
  en: "[EMERGENCY ALERT - NER VISION]",
  hi: "[आपातकालीन चेतावनी - NER]",
  as: "[জৰুৰী সতৰ্কতা - NER]",
  mni: "[জরুরী সতর্কতা - NER]",
  lus: "[KHAWCHHIA HRIATTIRNA - NER]",
  ne: "[आपतकालीन चेतावनी - NER]",
  trp: "[GWBWRWI SAKHLAI - NER]",
  brx: "[जाब्रबथाय सांग्रांथि - NER]",
  kha: "[JINGPYNTIP KYRKIEH - NER]",
  grt: "[BIKROTA MIKRAKATANI - NER]",
  njz: "[EMERGENCY ALERT - NER]",
  adi: "[EMERGENCY ALERT - NER]",
};

const SEVERITY_WORDS: Record<string, Record<string, string>> = {
  critical: {
    en: "CRITICAL",
    hi: "अत्यंत गंभीर",
    as: "চৰম সংকটজনক",
    mni: "য়াম্না অকনবা",
    lus: "Hlauhawm zual",
    ne: "अत्यन्त गम्भीर",
    trp: "Kwplai gwbwrwi",
    brx: "गोख्रोन्थार",
    kha: "Ba shyrkhei",
  },
  major: {
    en: "MAJOR",
    hi: "बड़ा खतरा",
    as: "গুৰুতৰ বিপদ",
    mni: "অকনবা বিপদ",
    lus: "Pawi lian",
    ne: "ठूलो जोखिम",
    trp: "Kotor gwbwrwi",
    brx: "गेदेर खैफोद",
    kha: "Ka jingeh bakhraw",
  },
  high: {
    en: "HIGH",
    hi: "उच्च जोखिम",
    as: "উচ্চ বিপদ",
    mni: "ৱাংবা রিক্স",
    lus: "Hlauhawm",
    ne: "उच्च जोखिम",
    trp: "Chwng",
    brx: "गोजौ खैफोद",
    kha: "Ba khlain",
  },
};

const ACTION_TRANSLATIONS: Record<string, Record<string, string>> = {
  hi: {
    divert: "तुरंत वैकल्पिक मार्ग (डायवर्जन) लें और सुरक्षित स्थान पर रुकें।",
    stop: "तत्काल वाहन रोकें और आगे बढ़ने का प्रयास न करें।",
    priority: "आवश्यक राहत व चिकित्सा वाहनों को प्राथमिकता दें।",
    default: "सावधानी बरतें और स्थानीय आपदा प्रबंधन निर्देशों का पालन करें।",
  },
  as: {
    divert: "অনতিপলমে বিকল্প পথ লওক আৰু সুৰক্ষিত স্থানত বাহন ৰাখক।",
    stop: "তৎক্ষণাৎ বাহন ৰখাওক আৰু আগবাঢ়িবলৈ চেষ্টা নকৰিব।",
    priority: "অত্যাৱশ্যকীয় সাহাৰ্য্য বাহনক অগ্ৰাধিকাৰ দিয়ক।",
    default: "সাৱধান হওক আৰু দুৰ্যোগ ব্যৱস্থাপনাৰ নিৰ্দেশনা মানি চলক।",
  },
  mni: {
    divert: "খুদক্তা অতোপ্পা লম্বী (ডাইভরসন) লৌবীয়ু অমসুং কন্নবা মফমদা লেপীয়ু।",
    stop: "খুদক্তা গাড়ি লেপহন্নু অমসুং মাংলোমদা চৎনবা হোৎনবীয়ু নত্তে।",
    priority: "মথৌ তাবা রিলিফ পোৎলম পুবা গাড়িশিংদা অহানবা খুদোংচাবা পীউ।",
    default: "চেকশিন্না লৈবীয়ু অমসুং ডিজাস্টার ম্যানেজমেন্টগী পাউতাক ইল্লীয়ু।",
  },
  lus: {
    divert: "Kawng dang zawh nghal la, hmun himah motor tiding rawh.",
    stop: "Motor tiding nghal la, kal luih tum suh.",
    priority: "Damdawi leh chhawmdawlna phur motor te kal hmasak tir rawh.",
    default: "Fimkhur la, thuneitute thupek zawm rawh.",
  },
  ne: {
    divert: "तुरुन्त वैकल्पिक मार्ग लिनुहोस् र सुरक्षित स्थानमा रोकिनुहोस्।",
    stop: "तुरुन्त सवारी रोक्नुहोस् र अगाडि बढ्ने प्रयास नगर्नुहोस्।",
    priority: "अत्यावश्यक राहत तथा औषधि सवारीलाई प्राथमिकता दिनुहोस्।",
    default: "सावधानी अपनाउनुहोस् र विपद् व्यवस्थापन निर्देशन पालना गर्नुहोस्।",
  },
  brx: {
    divert: "गोख्रोयै गुबुन लामा लादो आरो सांग्रां जायगायाव थादो।",
    stop: "गोख्रोयै गाडी लाखिदो आरो सिगां थांनो नाजानाङा।",
    priority: "गोनांथार जाब्रबथाय गाडीफोरनो सिगां लामा होदो।",
    default: "सांग्रां थादो आरो जाब्रबथाय थिसननाय राहा फालिना सोलिदो।",
  },
  trp: {
    divert: "Ulo lama khwna tei kaham jagao tongdi.",
    stop: "Gari bachidi tei sakan thangnai rwana.",
    priority: "Nangmani relief garino lama phai.",
    default: "Hambai khe tongdi tei kothoma khnadi.",
  },
  kha: {
    divert: "Iaid na kawei pat ka surok bad sangeh ha ka jaka ba shngaiñ.",
    stop: "Sangeh noh ka kali bad wat pyrshang ban iaid shakhmat.",
    priority: "Ai lad nyngkong ia ki kali ba kit dawai bad jingiarap.",
    default: "Sumar bha bad bud ia ki hukum sorkar.",
  },
};

/**
 * Generate a localized SMS message under standard character limits
 */
export function generateLocalizedEmergencySms(
  alert: EmergencyAlertPayload,
  targetLang: string,
): string {
  const lang = targetLang.toLowerCase();
  const prefix = EMERGENCY_PREFIX[lang] || EMERGENCY_PREFIX.en;
  const sevWord =
    SEVERITY_WORDS[alert.severity.toLowerCase()]?.[lang] ||
    alert.severity.toUpperCase();

  const location = alert.locationName
    ? `${alert.locationName}${alert.district ? `, ${alert.district}` : ""}`
    : alert.district || "NER Corridor";

  // Pick an action phrase
  let actionText = alert.recommendedAction;
  const lowerAction = alert.recommendedAction.toLowerCase();
  const actionDict = ACTION_TRANSLATIONS[lang];

  if (actionDict) {
    if (lowerAction.includes("divert") || lowerAction.includes("alternative")) {
      actionText = actionDict.divert;
    } else if (lowerAction.includes("stop") || lowerAction.includes("suspend") || lowerAction.includes("halt")) {
      actionText = actionDict.stop;
    } else if (lowerAction.includes("priority") || lowerAction.includes("emergency vehicle")) {
      actionText = actionDict.priority;
    } else {
      actionText = actionDict.default;
    }
  }

  // Format tailored for SMS
  if (lang === "hi") {
    return `${prefix} [${sevWord}] ${location}: ${alert.title}। ${actionText} सहायता: 112`;
  }
  if (lang === "as") {
    return `${prefix} [${sevWord}] ${location}: ${alert.title}। ${actionText} সহায় হেল্পলাইন: 112`;
  }
  if (lang === "mni") {
    return `${prefix} [${sevWord}] ${location}: ${alert.title}। ${actionText} মতেং হেল্পলাইন: 112`;
  }
  if (lang === "lus") {
    return `${prefix} [${sevWord}] ${location}: ${alert.title}. ${actionText} Helpline: 112`;
  }
  if (lang === "ne") {
    return `${prefix} [${sevWord}] ${location}: ${alert.title}। ${actionText} सहायता: 112`;
  }
  if (lang === "brx") {
    return `${prefix} [${sevWord}] ${location}: ${alert.title}। ${actionText} जाब्रबथाय: 112`;
  }
  if (lang === "trp") {
    return `${prefix} [${sevWord}] ${location}: ${alert.title}. ${actionText} Helpline: 112`;
  }
  if (lang === "kha") {
    return `${prefix} [${sevWord}] ${location}: ${alert.title}. ${actionText} Helpline: 112`;
  }

  // Default English
  return `${prefix} [${sevWord}] ${location}: ${alert.title}. ${actionText} Emergency Help: 112`;
}

/**
 * Storage helpers for LocalStorage persistence
 */
const STORAGE_KEY_CONTACTS = "ner_vision_sms_contacts_v3";
const STORAGE_KEY_QUOTA = "ner_vision_sms_quota_v1";
const STORAGE_KEY_LOGS = "ner_vision_sms_logs_v1";

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function loadSmsContacts(): EmergencyContact[] {
  if (typeof window === "undefined") return INITIAL_EMERGENCY_CONTACTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONTACTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_CONTACTS, JSON.stringify(INITIAL_EMERGENCY_CONTACTS));
      return INITIAL_EMERGENCY_CONTACTS;
    }
    const parsed: EmergencyContact[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY_CONTACTS, JSON.stringify(INITIAL_EMERGENCY_CONTACTS));
      return INITIAL_EMERGENCY_CONTACTS;
    }
    // Ensure all INITIAL_EMERGENCY_CONTACTS are present
    const existingPhones = new Set(parsed.map((p) => p.phone.replace(/\s+/g, "")));
    let hasAdditions = false;
    for (const initContact of INITIAL_EMERGENCY_CONTACTS) {
      if (!existingPhones.has(initContact.phone.replace(/\s+/g, ""))) {
        parsed.push(initContact);
        hasAdditions = true;
      }
    }
    if (hasAdditions) {
      localStorage.setItem(STORAGE_KEY_CONTACTS, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return INITIAL_EMERGENCY_CONTACTS;
  }
}

export function saveSmsContacts(contacts: EmergencyContact[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_CONTACTS, JSON.stringify(contacts));
}

export function loadSmsQuota(): SmsQuotaSettings {
  const today = getTodayKey();
  const defaultQuota: SmsQuotaSettings = {
    senderPhone: DEFAULT_SENDER_NUMBER,
    dailyLimit: DEFAULT_DAILY_LIMIT,
    usedToday: 0,
    lastResetDate: today,
    autoDispatchOnCritical: true,
    gatewayType: "direct_phone",
  };

  if (typeof window === "undefined") return defaultQuota;

  try {
    const raw = localStorage.getItem(STORAGE_KEY_QUOTA);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_QUOTA, JSON.stringify(defaultQuota));
      return defaultQuota;
    }
    const parsed: SmsQuotaSettings = JSON.parse(raw);
    // Automatic daily reset at midnight
    if (parsed.lastResetDate !== today) {
      parsed.usedToday = 0;
      parsed.lastResetDate = today;
      localStorage.setItem(STORAGE_KEY_QUOTA, JSON.stringify(parsed));
    }
    // Ensure sender is 9390093424 if not configured
    if (!parsed.senderPhone) {
      parsed.senderPhone = DEFAULT_SENDER_NUMBER;
    }
    return parsed;
  } catch {
    return defaultQuota;
  }
}

export function saveSmsQuota(quota: SmsQuotaSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_QUOTA, JSON.stringify(quota));
}

export function loadSmsLogs(): SmsLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOGS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function appendSmsLog(entry: SmsLogEntry): void {
  if (typeof window === "undefined") return;
  try {
    const logs = loadSmsLogs();
    const updated = [entry, ...logs].slice(0, 100); // keep last 100
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to append SMS log", err);
  }
}

/**
 * Clean phone number for tel/sms protocols
 */
export function sanitizePhoneNumber(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

/**
 * Generate native SMS link (`sms:`) for device dispatch
 */
export function createDirectSmsUri(phone: string, message: string): string {
  const cleanPhone = sanitizePhoneNumber(phone);
  const isApple =
    typeof navigator !== "undefined" &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

  const separator = isApple ? "&" : "?";
  return `sms:${cleanPhone}${separator}body=${encodeURIComponent(message)}`;
}

/**
 * Generate WhatsApp link fallback
 */
export function createWhatsAppUri(phone: string, message: string): string {
  const cleanPhone = sanitizePhoneNumber(phone).replace(/^\+/, "");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
