"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { useTranslation } from "react-i18next";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Eye, EyeOff, LogIn, Loader2, ShieldCheck, KeyRound, ChevronDown, ChevronUp, UserCheck } from "lucide-react";

/**
 * Email + password login page.
 *
 * Deliberately avoids specifying whether the email or password was wrong to
 * prevent user enumeration attacks. All errors surface as a single generic
 * "invalid email or password" message.
 */
export default function LoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [authLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn("password", {
        email: email.trim(),
        password,
        flow: "signIn",
      });
      if (result.signingIn) {
        window.location.href = "/dashboard";
      }
    } catch {
      setError(t("auth.invalid_credentials", "Invalid email or password."));
    } finally {
      setIsLoading(false);
    }
  };

  const credentials = useQuery(api.credentials.listCredentials);
  const [showCreds, setShowCreds] = useState(false);

  const handleQuickFill = (credEmail: string, credPass: string) => {
    setEmail(credEmail);
    setPassword(credPass);
    setError(null);
  };

  return (
    <div className="w-full max-w-lg">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-[oklch(0.815_0.145_88)]">
          NER-Vision AI
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("auth.login_title", "Sign In")}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {t("auth.login_subtitle", "Sign in to your NER-Vision AI account")}
        </p>
      </div>

      {/* Card */}
      <div className="rounded-xl border border-border bg-card p-8 shadow-lg shadow-black/20">
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
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
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-foreground"
              >
                {t("auth.password", "Password")}
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary hover:underline"
                tabIndex={-1}
              >
                {t("auth.forgot_password", "Forgot password?")}
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
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
            disabled={isLoading || !email || !password}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("auth.signing_in", "Signing in…")}
              </>
            ) : (
              <>
                <LogIn className="size-4" />
                {t("auth.sign_in", "Sign In")}
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials Autofill Accordion */}
        <div className="mt-6 rounded-lg border border-border/80 bg-background/60 p-3.5">
          <button
            type="button"
            onClick={() => setShowCreds((prev) => !prev)}
            className="flex w-full items-center justify-between text-xs font-medium text-foreground hover:text-primary transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <KeyRound className="size-3.5 text-primary" />
              <span>Convex Database Login Credentials ({credentials ? credentials.length : 7})</span>
            </span>
            {showCreds ? (
              <ChevronUp className="size-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground" />
            )}
          </button>

          {showCreds && (
            <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
              <p className="text-[11px] text-muted-foreground">
                Click any role to autofill verified credentials stored in Convex:
              </p>
              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
                {(credentials || []).map((cred) => (
                  <button
                    key={cred.email}
                    type="button"
                    onClick={() => handleQuickFill(cred.email, cred.password)}
                    className="flex items-start justify-between rounded-md border border-border/60 bg-card p-2 text-left hover:border-primary/60 hover:bg-primary/5 transition-all group"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-xs text-foreground group-hover:text-primary">
                          {cred.name}
                        </span>
                        <span
                          className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border ${
                            cred.role === "admin"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              : cred.role === "logistics_operator"
                                ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                                : cred.role === "emergency_authority"
                                  ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          }`}
                        >
                          {cred.role.replace("_", " ")}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground">
                        {cred.email}
                      </div>
                      <div className="text-[10px] text-muted-foreground/80">
                        Pass: <span className="font-mono text-foreground font-semibold">{cred.password}</span>
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1">
                      <UserCheck className="size-3" />
                      Autofill
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer link */}
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {t("auth.no_account", "Don't have an account?")}{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            {t("auth.sign_up_link", "Sign up")}
          </Link>
        </p>
      </div>
    </div>
  );
}
