"use client";

import { useTranslation } from "react-i18next";
import { Check, Globe, Languages } from "lucide-react";
import { SUPPORTED_LANGUAGES, type SupportedLanguageCode } from "@/lib/i18n/config";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  className?: string;
  variant?: "header" | "compact" | "full";
}

export function LanguageSwitcher({
  className,
  variant = "header",
}: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();
  const currentLang = (i18n.language?.split("-")[0] || "en") as SupportedLanguageCode;

  const currentMeta =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) ??
    SUPPORTED_LANGUAGES[0];

  const handleSelectLanguage = (code: string) => {
    void i18n.changeLanguage(code);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size={variant === "compact" ? "icon" : "sm"}
            className={cn("gap-2 px-2.5", className)}
            aria-label={`Select language: currently ${currentMeta.nativeName}`}
          />
        }
      >
        <Languages className="size-4 shrink-0 text-muted-foreground" />
        {variant !== "compact" && (
          <span className="max-w-[100px] truncate text-xs font-medium md:max-w-none">
            {currentMeta.nativeName}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="max-h-[380px] w-72 overflow-y-auto"
      >
        <DropdownMenuLabel className="flex items-center justify-between text-xs">
          <span className="font-semibold">{t("settings.language_section", "Regional Languages")}</span>
          <span className="font-mono text-[10px] text-muted-foreground">
            12 languages
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuGroup className="py-1">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = currentLang === lang.code;

            return (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => handleSelectLanguage(lang.code)}
                className={cn(
                  "flex items-center justify-between gap-3 py-2 cursor-pointer",
                  isSelected && "bg-accent/60 font-semibold"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm leading-snug">
                      {lang.nativeName}
                    </span>
                    {lang.group === "B" && (
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                        En fallback
                      </span>
                    )}
                  </div>
                  <span className="block text-[11px] text-muted-foreground">
                    {lang.name} · {lang.script}
                  </span>
                </div>

                {isSelected ? (
                  <Check className="size-4 shrink-0 text-primary" />
                ) : (
                  <span className="size-4 shrink-0" />
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <div className="px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
          {currentMeta.group === "B"
            ? t(
                "settings.group_b_notice",
                "Group B: Native speaker translation in progress. Falling back to English."
              )
            : currentMeta.group === "A"
              ? t(
                  "settings.group_a_notice",
                  "Group A: Machine translation draft enabled. Community review welcomed."
                )
              : "Base language: English"}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
