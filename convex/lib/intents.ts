/**
 * Operations assistant — intent classification (pure).
 *
 * ## What this is, honestly
 *
 * Keyword and pattern matching, not natural language understanding. It
 * recognises a fixed set of operational questions and says plainly when a
 * question falls outside that set. It never guesses.
 *
 * ## Why it is shaped this way
 *
 * The response contract below (`AssistantAnswer`) is the same structure a
 * real LLM would be required to return: answer, observations, risks,
 * recommendations, affected entities, confidence, limitations. When a
 * provider is configured, the classifier is replaced but the contract — and
 * therefore the whole frontend — stays identical.
 *
 * The deterministic path also remains the fallback for when a provider is
 * unavailable, so the assistant never goes dark.
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
 * Ordered most-specific first: the first rule that matches wins, so
 * "delayed critical deliveries" resolves to deliveries rather than vehicles.
 */
const RULES: Rule[] = [
  {
    intent: "highest_risk_district",
    require: [["highest", "most", "worst", "top"], ["risk", "risky", "danger"]],
    shortcuts: ["highest risk district", "most dangerous district"],
  },
  {
    intent: "critical_deliveries",
    require: [
      ["critical", "emergency", "priority", "medicine"],
      ["delivery", "deliveries", "consignment", "consignments", "cargo"],
    ],
  },
  {
    intent: "delayed_deliveries",
    require: [
      ["delayed", "late", "overdue", "behind"],
      ["delivery", "deliveries", "consignment", "consignments"],
    ],
  },
  {
    intent: "delayed_vehicles",
    require: [
      ["delayed", "late", "stuck", "halted", "stopped"],
      ["vehicle", "vehicles", "truck", "trucks", "fleet"],
    ],
  },
  {
    intent: "high_risk_vehicles",
    require: [
      ["risk", "risky", "danger", "dangerous", "exposed", "attention"],
      ["vehicle", "vehicles", "truck", "trucks", "fleet"],
    ],
  },
  {
    intent: "emergency_vehicles",
    require: [["emergency"], ["vehicle", "vehicles", "fleet", "ambulance"]],
  },
  {
    intent: "blocked_roads",
    require: [
      ["blocked", "closed", "impassable", "shut"],
      ["road", "roads", "corridor", "corridors", "highway", "highways"],
    ],
    shortcuts: ["which roads are blocked", "blocked roads", "road closures"],
  },
  {
    intent: "high_risk_roads",
    require: [
      ["risk", "risky", "dangerous", "restricted", "unsafe"],
      ["road", "roads", "corridor", "corridors", "highway", "highways"],
    ],
  },
  {
    intent: "critical_incidents",
    require: [
      ["critical", "major", "severe", "worst"],
      ["incident", "incidents", "event", "events"],
    ],
  },
  {
    intent: "active_incidents",
    require: [["incident", "incidents", "landslide", "flood", "accident"]],
    shortcuts: ["show incidents", "what incidents"],
  },
  {
    intent: "recent_changes",
    require: [
      ["changed", "change", "happened", "new", "recent", "last"],
    ],
    shortcuts: ["what changed", "what has changed", "recent activity"],
  },
  {
    intent: "priorities",
    require: [
      ["prioritise", "prioritize", "priority", "focus", "attention", "next", "do"],
    ],
    shortcuts: [
      "what should we prioritize",
      "what should we prioritise",
      "what needs immediate attention",
      "what should we do",
      "what requires attention",
    ],
  },
  {
    intent: "operational_health",
    require: [["health", "score", "status"], ["overall", "system", "network", "operational", "logistics"]],
    shortcuts: ["health score", "operational health"],
  },
  {
    intent: "situation_summary",
    require: [["summarise", "summarize", "summary", "situation", "overview", "brief", "briefing", "happening"]],
    shortcuts: [
      "what is happening",
      "whats happening",
      "summarise the situation",
      "summarize the situation",
      "current situation",
    ],
  },
];

/** Normalise for matching: lowercase, strip punctuation, collapse spaces. */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Classify a question.
 *
 * Confidence reflects how much of the rule matched, not how correct the
 * answer is — the data behind every supported intent is exact.
 */
export function classifyIntent(question: string): IntentMatch {
  const text = normalise(question);

  if (text.length === 0) {
    return { intent: "unsupported", matched: [], confidence: 0 };
  }

  for (const rule of RULES) {
    // Shortcut phrases are unambiguous — match them first.
    const shortcut = rule.shortcuts?.find((phrase) =>
      text.includes(normalise(phrase)),
    );
    if (shortcut) {
      return { intent: rule.intent, matched: [shortcut], confidence: 95 };
    }
  }

  for (const rule of RULES) {
    const hits: string[] = [];
    const satisfied = rule.require.every((group) => {
      const hit = group.find((word) => text.includes(word));
      if (hit) hits.push(hit);
      return Boolean(hit);
    });

    if (satisfied) {
      // More required groups matched means a more specific rule fired.
      const confidence = Math.min(90, 55 + rule.require.length * 12);
      return { intent: rule.intent, matched: hits, confidence };
    }
  }

  return { intent: "unsupported", matched: [], confidence: 0 };
}

/** Questions the assistant is known to handle, surfaced as suggestions. */
export const SUGGESTED_QUESTIONS: string[] = [
  "What is happening right now?",
  "What should we prioritise?",
  "Which district has the highest risk?",
  "Which roads are blocked?",
  "Which vehicles are delayed?",
  "Which critical deliveries are at risk?",
  "Show critical incidents.",
  "What changed in the last 24 hours?",
];

/* ------------------------------------------------------ answer contract */

export interface AffectedEntity {
  kind: "district" | "road" | "vehicle" | "delivery" | "incident" | "alert";
  label: string;
  detail?: string;
}

/**
 * The structured answer shape.
 *
 * Deliberately identical to what a future LLM integration must return, so
 * swapping the engine changes nothing above this layer.
 */
export interface AssistantAnswer {
  intent: IntentCode;
  /** Direct response to the question asked. */
  answer: string;
  /** One-line headline. */
  summary: string;
  /** Facts read straight from the database. */
  observations: string[];
  /** Forecasts and inferences — never presented as confirmed fact. */
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
