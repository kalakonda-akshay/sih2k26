export interface LanguageMeta {
  code: string;
  name: string;
  nativeName: string;
  script: "Latin" | "Devanagari" | "Bengali" | "Bengali/Latin";
  group: "Base" | "A" | "B";
  status: "complete" | "draft_machine_translation" | "placeholder_untranslated";
  reviewNeeded: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    script: "Latin",
    group: "Base",
    status: "complete",
    reviewNeeded: false,
  },
  {
    code: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
    script: "Devanagari",
    group: "A",
    status: "draft_machine_translation",
    reviewNeeded: true,
  },
  {
    code: "as",
    name: "Assamese",
    nativeName: "অসমীয়া",
    script: "Bengali",
    group: "A",
    status: "draft_machine_translation",
    reviewNeeded: true,
  },
  {
    code: "mni",
    name: "Manipuri (Meitei)",
    nativeName: "মৈতৈলোন্ (মণিপুরী)",
    script: "Bengali",
    group: "A",
    status: "draft_machine_translation",
    reviewNeeded: true,
  },
  {
    code: "lus",
    name: "Mizo",
    nativeName: "Mizo ṭawng",
    script: "Latin",
    group: "A",
    status: "draft_machine_translation",
    reviewNeeded: true,
  },
  {
    code: "trp",
    name: "Kokborok",
    nativeName: "ককবরক",
    script: "Bengali/Latin",
    group: "A",
    status: "draft_machine_translation",
    reviewNeeded: true,
  },
  {
    code: "kha",
    name: "Khasi",
    nativeName: "Ka Ktien Khasi",
    script: "Latin",
    group: "A",
    status: "draft_machine_translation",
    reviewNeeded: true,
  },
  {
    code: "grt",
    name: "Garo",
    nativeName: "A·chik",
    script: "Latin",
    group: "B",
    status: "placeholder_untranslated",
    reviewNeeded: true,
  },
  {
    code: "brx",
    name: "Bodo",
    nativeName: "बर'",
    script: "Devanagari",
    group: "A",
    status: "draft_machine_translation",
    reviewNeeded: true,
  },
  {
    code: "ne",
    name: "Nepali",
    nativeName: "नेपाली",
    script: "Devanagari",
    group: "A",
    status: "draft_machine_translation",
    reviewNeeded: true,
  },
  {
    code: "njz",
    name: "Nyishi",
    nativeName: "Nyishi",
    script: "Latin",
    group: "B",
    status: "placeholder_untranslated",
    reviewNeeded: true,
  },
  {
    code: "adi",
    name: "Adi",
    nativeName: "Adi",
    script: "Latin",
    group: "B",
    status: "placeholder_untranslated",
    reviewNeeded: true,
  },
];

export type SupportedLanguageCode =
  | "en"
  | "hi"
  | "as"
  | "mni"
  | "lus"
  | "trp"
  | "kha"
  | "grt"
  | "brx"
  | "ne"
  | "njz"
  | "adi";

export const DEFAULT_LANGUAGE: SupportedLanguageCode = "en";
export const FALLBACK_LANGUAGE: SupportedLanguageCode = "en";
export const STORAGE_KEY = "i18nextLng";

export function getLanguageMeta(code: string): LanguageMeta {
  const match = SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
  return (
    match ??
    SUPPORTED_LANGUAGES.find((lang) => lang.code === DEFAULT_LANGUAGE)!
  );
}
