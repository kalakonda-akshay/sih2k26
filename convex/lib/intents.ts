/**
 * Operations assistant — intent classification (pure).
 *
 * Grounded rule-based operational intent classification supporting English,
 * Hindi, Assamese, and North-Eastern regional operational terms.
 */

export type IntentCode =
  | "highest_risk_district"
  | "active_incidents"
  | "critical_incidents"
  | "blocked_roads"
  | "high_risk_roads"
  | "delayed_vehicles"
  | "high_risk_vehicles"
  | "emergency_vehicles"
  | "critical_deliveries"
  | "delayed_deliveries"
  | "priorities"
  | "recent_changes"
  | "situation_summary"
  | "operational_health"
  | "weather_summary"
  | "active_alerts"
  | "general_help"
  | "unsupported";

export interface IntentMatch {
  intent: IntentCode;
  /** Which phrases in the question triggered the match — shown to the user. */
  matched: string[];
  confidence: number;
}

interface Rule {
  intent: IntentCode;
  /** All of these groups must have at least one hit for the rule to fire. */
  require: string[][];
  /** Optional single-phrase shortcuts that fire the rule on their own. */
  shortcuts?: string[];
}

/**
 * Ordered most-specific first: the first rule that matches wins.
 */
const RULES: Rule[] = [
  // 1. General Help / Greetings
  {
    intent: "general_help",
    require: [
      [
        "hello",
        "hi",
        "hey",
        "help",
        "guide",
        "who are you",
        "what can you do",
        "commands",
        "options",
        "menu",
        "namaste",
        "नमस्ते",
        "मदद",
        "सहायता",
        "নমস্কাৰ",
        "মদদ",
        "khublei",
        "chibai",
      ],
    ],
    shortcuts: [
      "help",
      "hi",
      "hello",
      "hey",
      "नमस्ते",
      "मदद",
      "options",
      "what can you do",
      "guide",
    ],
  },

  // 2. Weather & Rainfall
  {
    intent: "weather_summary",
    require: [
      [
        "weather",
        "rain",
        "rainfall",
        "precipitation",
        "monsoon",
        "cloud",
        "storm",
        "forecast",
        "flood warning",
        "मौसम",
        "बारिश",
        "वर्षा",
        "বৃষ্টি",
        "বৰষুণ",
        "ruah",
        "barish",
        "boroxun",
      ],
    ],
    shortcuts: [
      "weather",
      "weather report",
      "is it raining",
      "rainfall status",
      "weather warning",
      "rain",
      "rainfall",
      "monsoon",
      "मौसम",
      "बारिश",
    ],
  },

  // 3. Alerts
  {
    intent: "active_alerts",
    require: [
      [
        "alert",
        "alerts",
        "warning",
        "warnings",
        "alarm",
        "alarms",
        "siren",
        "चेतावनी",
        "अलर्ट",
        "সতর্কতা",
        "maham",
        "hriattirna",
      ],
    ],
    shortcuts: [
      "show alerts",
      "active alerts",
      "what alerts",
      "critical alerts",
      "any warnings",
      "alerts",
      "warnings",
      "चेतावनी",
    ],
  },

  // 4. District Risk
  {
    intent: "highest_risk_district",
    require: [
      [
        "highest",
        "most",
        "worst",
        "top",
        "danger",
        "risky",
        "risk",
        "hazard",
        "vulnerable",
        "खतरनाक",
        "বিপদজনক",
        "जोखिम",
      ],
      [
        "district",
        "districts",
        "region",
        "area",
        "zone",
        "location",
        "place",
        "जिला",
        "स्थान",
        "অঞ্চল",
        "zila",
      ],
    ],
    shortcuts: [
      "highest risk district",
      "most dangerous district",
      "which district is at risk",
      "worst district",
      "district risk",
      "district",
      "districts",
      "खतरनाक जिला",
    ],
  },

  // 5. Critical Deliveries
  {
    intent: "critical_deliveries",
    require: [
      [
        "critical",
        "emergency",
        "priority",
        "medicine",
        "medical",
        "urgent",
        "food",
        "fuel",
        "জরুরী",
        "ज़रूरी",
        "प्राथमिकता",
      ],
      [
        "delivery",
        "deliveries",
        "consignment",
        "consignments",
        "cargo",
        "shipment",
        "डिलीवरी",
        "पार्सल",
      ],
    ],
    shortcuts: [
      "critical deliveries",
      "emergency deliveries",
      "priority deliveries",
      "medical cargo",
      "medicine deliveries",
    ],
  },

  // 6. Delayed Deliveries
  {
    intent: "delayed_deliveries",
    require: [
      ["delayed", "late", "overdue", "behind", "stuck", "pending", "देर", "विलंबित"],
      ["delivery", "deliveries", "consignment", "consignments", "cargo", "shipment", "डिलीवरी"],
    ],
    shortcuts: [
      "delayed deliveries",
      "late deliveries",
      "which deliveries are late",
      "overdue consignments",
    ],
  },

  // 7. Delayed Vehicles
  {
    intent: "delayed_vehicles",
    require: [
      ["delayed", "late", "stuck", "halted", "stopped", "held", "देर", "रुकी", "अटकी"],
      ["vehicle", "vehicles", "truck", "trucks", "fleet", "lorry", "carrier", "गाड़ी", "गाड़ियाँ", "वाहन", "গাড়ী"],
    ],
    shortcuts: [
      "delayed vehicles",
      "stuck trucks",
      "which vehicles are delayed",
      "delayed trucks",
      "रुकी गाड़ियाँ",
    ],
  },

  // 8. High Risk Vehicles
  {
    intent: "high_risk_vehicles",
    require: [
      ["risk", "risky", "danger", "dangerous", "exposed", "threatened", "खतरे में", "जोखिम"],
      ["vehicle", "vehicles", "truck", "trucks", "fleet", "गाड़ी", "वाहन"],
    ],
    shortcuts: [
      "high risk vehicles",
      "risky trucks",
      "which vehicles are at risk",
      "vehicles in danger",
    ],
  },

  // 9. Emergency Vehicles
  {
    intent: "emergency_vehicles",
    require: [
      ["emergency", "ambulance", "rescue", "आपातकालीन", "জরুরী"],
      ["vehicle", "vehicles", "fleet", "ambulance", "truck", "trucks", "वाहन", "गाड़ी"],
    ],
    shortcuts: [
      "emergency vehicles",
      "ambulances",
      "emergency fleet",
      "rescue vehicles",
      "आपातकालीन वाहन",
    ],
  },

  // 10. Blocked Roads
  {
    intent: "blocked_roads",
    require: [
      ["blocked", "closed", "impassable", "shut", "severed", "cut off", "block", "closure", "closures", "बंद", "অৱৰোধ", "বন্ধ"],
      ["road", "roads", "corridor", "corridors", "highway", "highways", "route", "routes", "pass", "सड़क", "रास्ता", "পথ", "ৰাস্তা"],
    ],
    shortcuts: [
      "which roads are blocked",
      "blocked roads",
      "road closures",
      "is any road closed",
      "closed highways",
      "what roads are closed",
      "बंद सड़कें",
    ],
  },

  // 11. High Risk Roads
  {
    intent: "high_risk_roads",
    require: [
      ["risk", "risky", "dangerous", "restricted", "unsafe", "hazard", "vulnerable", "खतरनाक", "বিপদজনক", "जोखिम"],
      ["road", "roads", "corridor", "corridors", "highway", "highways", "route", "routes", "सड़क", "रास्ता"],
    ],
    shortcuts: [
      "high risk roads",
      "dangerous roads",
      "which roads are dangerous",
      "unsafe corridors",
      "risky roads",
    ],
  },

  // 12. Critical Incidents
  {
    intent: "critical_incidents",
    require: [
      ["critical", "major", "severe", "worst", "fatal", "massive", "गंभीर", "बड़ी"],
      ["incident", "incidents", "event", "events", "disaster", "landslide", "flood", "घटना", "हादसा"],
    ],
    shortcuts: [
      "critical incidents",
      "major incidents",
      "show critical incidents",
      "severe landslides",
      "major floods",
      "गंभीर घटना",
    ],
  },

  // 13. Active Incidents (or any incident query)
  {
    intent: "active_incidents",
    require: [
      ["incident", "incidents", "landslide", "landslides", "flood", "floods", "accident", "accidents", "damage", "collapse", "घटना", "घटनाएं", "भूस्खलन", "बाढ़", "দুৰ্ঘটনা"],
    ],
    shortcuts: [
      "show incidents",
      "what incidents",
      "active incidents",
      "any landslides",
      "any floods",
      "incidents",
      "landslides",
      "floods",
      "घटनाएं",
    ],
  },

  // 14. Roads Fallback (if user asks generally about roads)
  {
    intent: "blocked_roads",
    require: [
      ["road", "roads", "corridor", "corridors", "highway", "highways", "nh-6", "nh-27", "nh-10", "सड़क", "रास्ता", "পথ", "ৰাস্তা"],
    ],
    shortcuts: [
      "road status",
      "roads",
      "how are the roads",
      "corridor status",
      "highways",
      "routes",
      "सड़क की स्थिति",
    ],
  },

  // 15. Vehicles Fallback
  {
    intent: "delayed_vehicles",
    require: [
      ["vehicle", "vehicles", "truck", "trucks", "fleet", "गाड़ी", "वाहन", "ট্রাক"],
    ],
    shortcuts: [
      "vehicles",
      "fleet status",
      "trucks",
      "vehicle status",
      "how are vehicles",
      "fleet",
      "गाड़ियों की स्थिति",
    ],
  },

  // 16. Deliveries Fallback
  {
    intent: "critical_deliveries",
    require: [
      ["delivery", "deliveries", "consignment", "consignments", "cargo", "shipment", "डिलीवरी"],
    ],
    shortcuts: [
      "deliveries",
      "delivery status",
      "consignments",
      "cargo status",
      "shipments",
    ],
  },

  // 17. Recent Changes
  {
    intent: "recent_changes",
    require: [
      ["changed", "change", "changes", "happened", "new", "recent", "last 24", "history", "log", "activity", "बदलाव", "गतिविधि"],
    ],
    shortcuts: [
      "what changed",
      "what has changed",
      "recent activity",
      "recent changes",
      "what happened",
      "latest updates",
    ],
  },

  // 18. Priorities / What to do
  {
    intent: "priorities",
    require: [
      ["prioritise", "prioritize", "priority", "priorities", "focus", "attention", "action", "do", "recommend", "next", "प्राथमिकता", "क्या करें"],
    ],
    shortcuts: [
      "what should we prioritize",
      "what should we prioritise",
      "what needs immediate attention",
      "what should we do",
      "what requires attention",
      "priorities",
      "action items",
      "what next",
    ],
  },

  // 19. Operational Health
  {
    intent: "operational_health",
    require: [
      ["health", "score", "performance", "readiness", "हेल्थ", "स्वास्थ्य"],
    ],
    shortcuts: [
      "health score",
      "operational health",
      "system health",
      "network health",
    ],
  },

  // 20. Situation Summary / Overview
  {
    intent: "situation_summary",
    require: [
      [
        "summarise",
        "summarize",
        "summary",
        "situation",
        "overview",
        "brief",
        "briefing",
        "happening",
        "status",
        "report",
        "update",
        "current",
        "state",
        "now",
        "everything",
        "condition",
        "स्थिति",
        "हालचाल",
        "আপডেট",
        "সারসংক্ষেপ",
      ],
    ],
    shortcuts: [
      "what is happening",
      "whats happening",
      "what is happening right now",
      "summarise the situation",
      "summarize the situation",
      "current situation",
      "status",
      "overview",
      "report",
      "update",
      "briefing",
      "situation",
      "how is everything",
      "is everything okay",
      "स्थिति क्या है",
    ],
  },
];

/** Normalise for matching: lowercase, strip special characters, retain Unicode letters/marks/numbers. */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Classify a question into an actionable operational intent.
 */
export function classifyIntent(question: string): IntentMatch {
  const text = normalise(question);

  if (text.length === 0) {
    return { intent: "general_help", matched: ["help"], confidence: 90 };
  }

  // 1. Check exact shortcut phrases first
  for (const rule of RULES) {
    const shortcut = rule.shortcuts?.find((phrase) =>
      text.includes(normalise(phrase)),
    );
    if (shortcut) {
      return { intent: rule.intent, matched: [shortcut], confidence: 95 };
    }
  }

  // 2. Check required word groups
  for (const rule of RULES) {
    const hits: string[] = [];
    const satisfied = rule.require.every((group) => {
      const hit = group.find((word) => text.includes(word));
      if (hit) hits.push(hit);
      return Boolean(hit);
    });

    if (satisfied) {
      const confidence = Math.min(90, 60 + rule.require.length * 10);
      return { intent: rule.intent, matched: hits, confidence };
    }
  }

  // 3. Fallback: If query mentions any entity keyword, route to relevant domain
  if (text.includes("road") || text.includes("corridor") || text.includes("highway") || text.includes("nh-") || text.includes("सड़क")) {
    return { intent: "blocked_roads", matched: ["roads"], confidence: 80 };
  }
  if (text.includes("vehicle") || text.includes("truck") || text.includes("fleet") || text.includes("गाड़ी")) {
    return { intent: "delayed_vehicles", matched: ["vehicles"], confidence: 80 };
  }
  if (text.includes("incident") || text.includes("landslide") || text.includes("flood") || text.includes("घटना")) {
    return { intent: "active_incidents", matched: ["incidents"], confidence: 80 };
  }
  if (text.includes("delivery") || text.includes("consignment") || text.includes("cargo") || text.includes("डिलीवरी")) {
    return { intent: "critical_deliveries", matched: ["deliveries"], confidence: 80 };
  }
  if (text.includes("rain") || text.includes("weather") || text.includes("मौसम")) {
    return { intent: "weather_summary", matched: ["weather"], confidence: 85 };
  }
  if (text.includes("alert") || text.includes("warning") || text.includes("चेतावनी")) {
    return { intent: "active_alerts", matched: ["alerts"], confidence: 85 };
  }
  if (text.includes("hi") || text.includes("hello") || text.includes("help") || text.includes("मदद")) {
    return { intent: "general_help", matched: ["help"], confidence: 90 };
  }

  // 4. Default to live comprehensive Situation Summary rather than "unsupported"
  return { intent: "situation_summary", matched: ["live context"], confidence: 75 };
}

/** Questions the assistant is known to handle, surfaced as suggestions. */
export const SUGGESTED_QUESTIONS: string[] = [
  "What is happening right now?",
  "What should we prioritise?",
  "Which roads are blocked?",
  "Which vehicles are delayed?",
  "Show weather and rainfall status.",
  "Which critical deliveries are at risk?",
  "Show critical incidents and landslides.",
  "Show active emergency alerts.",
];

/* ------------------------------------------------------ answer contract */

export interface AffectedEntity {
  kind: "district" | "road" | "vehicle" | "delivery" | "incident" | "alert";
  label: string;
  detail?: string;
}

export interface AssistantAnswer {
  intent: IntentCode;
  /** Direct response to the question asked. */
  answer: string;
  /** One-line headline. */
  summary: string;
  /** Facts read straight from the database. */
  observations: string[];
  /** Forecasts and inferences. */
  risks: string[];
  /** Suggested actions, for human approval. */
  recommendations: string[];
  affectedEntities: AffectedEntity[];
  confidence: number;
  /** What this answer cannot tell you. */
  limitations: string[];
  /** Which engine produced it. */
  source: "deterministic" | "llm";
}
