"use client";

import { useEffect, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n/client";
import { getLanguageMeta } from "@/lib/i18n/config";

export function I18nProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      if (typeof document !== "undefined") {
        document.documentElement.lang = lng;
        const meta = getLanguageMeta(lng);
        document.documentElement.setAttribute("data-script", meta.script);
      }
    };

    i18n.on("languageChanged", handleLanguageChanged);
    handleLanguageChanged(i18n.language || "en");

    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
