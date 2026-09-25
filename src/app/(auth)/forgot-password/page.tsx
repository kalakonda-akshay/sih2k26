"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowLeft, KeyRound } from "lucide-react";

/**
 * Password reset stub page.
 * Full reset flow (OTP email / magic link) will be added in a future iteration.
 */
export default function ForgotPasswordPage() {
  const { t } = useTranslation();

  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-[oklch(0.815_0.145_88)]">
          NER-Vision AI
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("auth.forgot_password_title", "Reset Password")}
        </h1>
      </div>

      {/* Card */}
      <div className="rounded-xl border border-border bg-card p-8 shadow-lg shadow-black/20 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="size-6 text-primary" />
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {t(
            "auth.forgot_password_coming_soon",
            "Password reset will be available soon. Please contact your administrator.",
          )}
        </p>

        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          {t("auth.back_to_login", "Back to Sign In")}
        </Link>
      </div>
    </div>
  );
}
