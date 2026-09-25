"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, UserPlus, Loader2 } from "lucide-react";
import { api } from "../../../../convex/_generated/api";

/**
 * Validates email format using a simple RFC-friendly pattern.
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Password must be >= 8 characters and contain at least one digit.
 */
function isStrongPassword(password: string): boolean {
  return password.length >= 8 && /\d/.test(password);
}

/**
 * Email + password signup page.
 *
 * After convex-dev/auth creates the user row, we call saveUserProfile to
 * attach the full name and default role ("field_officer") to the record.
 */
export default function SignupPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const saveUserProfile = useMutation(api.users.saveUserProfile);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [authLoading, isAuthenticated, router]);

  /** Client-side validation. Returns an error string or null. */
  const validate = (): string | null => {
    if (!name.trim()) {
      return t("auth.name_required", "Full name is required.");
    }
    if (!isValidEmail(email)) {
      return t("auth.invalid_email", "Please enter a valid email address.");
    }
    if (!isStrongPassword(password)) {
      return t(
        "auth.password_weak",
        "Password must be at least 8 characters with at least one number.",
      );
    }
    if (password !== confirmPassword) {
      return t("auth.passwords_mismatch", "Passwords do not match.");
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn("password", {
        email,
        password,
        name,
        flow: "signUp",
      });

      if (result.signingIn) {
        // Save extra profile fields onto the freshly created user row.
        await saveUserProfile({
          name: name.trim(),
          role: "field_officer",
          isActive: true,
        });
        router.push("/dashboard");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "";

      if (
        message.toLowerCase().includes("already") ||
        message.toLowerCase().includes("exists") ||
        message.toLowerCase().includes("duplicate")
      ) {
        setError(
          t(
            "auth.email_taken",
            "An account with this email already exists. Please Sign In.",
          ),
        );
      } else if (
        message.toLowerCase().includes("network") ||
        message.toLowerCase().includes("fetch")
      ) {
        setError(
          t("auth.network_error", "Connection error. Please try again."),
        );
      } else if (message) {
        setError(message);
      } else {
        setError(
          t(
            "auth.signup_failed",
            "Unable to create account. Please check your details and try again.",
          ),
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-[oklch(0.815_0.145_88)]">
          NER-Vision AI
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("auth.signup_title", "Create Account")}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {t("auth.signup_subtitle", "Join the NER-Vision AI platform")}
        </p>
      </div>

      {/* Card */}
      <div className="rounded-xl border border-border bg-card p-8 shadow-lg shadow-black/20">
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-foreground"
            >
              {t("auth.full_name", "Full Name")}
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Priya Sharma"
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground"
            >
              {t("auth.email", "Email Address")}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="officer@mdoner.gov.in"
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground"
            >
              {t("auth.password", "Password")}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                aria-label={
                  showPassword
                    ? t("auth.hide_password", "Hide password")
                    : t("auth.show_password", "Show password")
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t(
                "auth.password_weak",
                "Password must be at least 8 characters with at least one number.",
              )}
            </p>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="confirm-password"
              className="block text-sm font-medium text-foreground"
            >
              {t("auth.confirm_password", "Confirm Password")}
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((p) => !p)}
                aria-label={
                  showConfirmPassword
                    ? t("auth.hide_password", "Hide password")
                    : t("auth.show_password", "Show password")
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={
              isLoading || !name || !email || !password || !confirmPassword
            }
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("auth.signing_up", "Creating account…")}
              </>
            ) : (
              <>
                <UserPlus className="size-4" />
                {t("auth.sign_up", "Create Account")}
              </>
            )}
          </button>
        </form>

        {/* Footer link */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("auth.have_account", "Already have an account?")}{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            {t("auth.sign_in_link", "Sign in")}
          </Link>
        </p>
      </div>
    </div>
  );
}
