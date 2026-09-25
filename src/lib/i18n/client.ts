"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { resources } from "./resources";
import { DEFAULT_LANGUAGE, FALLBACK_LANGUAGE, STORAGE_KEY } from "./config";

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      defaultNS: "common",
      fallbackLng: FALLBACK_LANGUAGE,
      supportedLngs: [
        "en",
        "hi",
        "as",
        "mni",
        "lus",
        "trp",
        "kha",
        "grt",
        "brx",
        "ne",
        "njz",
        "adi",
      ],
      detection: {
        order: ["localStorage", "navigator", "htmlTag"],
        lookupLocalStorage: STORAGE_KEY,
        caches: ["localStorage"],
      },
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });
}

export default i18n;
