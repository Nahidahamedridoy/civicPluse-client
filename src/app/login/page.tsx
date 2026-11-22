"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Chip, Alert } from "@heroui/react";
import {
  Activity,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  KeyRound,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Email regex matching the backend User model schema
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      errors.email = "Email address is required.";
    } else if (!emailRegex.test(email.trim())) {
      errors.email = "Please enter a valid email address.";
    }

    if (!password) {
      errors.password = "Password is required.";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await login({
        email: email.trim(),
        password,
      });

      setSuccessMessage(
        `Welcome back, ${result.user.name}! Redirecting to ${result.redirectUrl}...`
      );

      // Safe redirect according to returned role (Requirement 6)
      setTimeout(() => {
        router.push(result.redirectUrl);
      }, 700);
    } catch (err: unknown) {
      setIsLoading(false);
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An unexpected authentication error occurred.");
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        {/* Top Branding & Title */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 group mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-sm group-hover:scale-105 transition-transform">
              <Activity className="h-6 w-6" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-foreground">
              Civic<span className="text-accent">Pulse</span>
            </span>
          </Link>

          <div className="flex justify-center">
            <Chip color="accent" variant="soft" size="sm">
              <ShieldCheck className="h-3 w-3 mr-1 inline" /> Secure Civic Portal
            </Chip>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Sign in to CivicPulse
          </h1>
          <p className="text-sm text-muted">
            Access citizen reporting, department workorders, and municipal telemetry.
          </p>
        </div>

        {/* Card Form */}
        <Card className="border border-border/80 bg-surface shadow-xl rounded-2xl p-6 sm:p-8 space-y-6 transition-colors">
          {/* Error Banner */}
          {errorMessage && (
            <Alert className="border border-danger/40 bg-danger/10 text-danger rounded-xl p-3.5">
              <Alert.Indicator>
                <AlertCircle className="h-5 w-5 text-danger shrink-0" />
              </Alert.Indicator>
              <Alert.Content>
                <Alert.Title className="text-xs font-bold">Authentication Failed</Alert.Title>
                <Alert.Description className="text-xs mt-0.5">{errorMessage}</Alert.Description>
              </Alert.Content>
            </Alert>
          )}

          {/* Success Banner */}
          {successMessage && (
            <Alert className="border border-success/40 bg-success/10 text-success rounded-xl p-3.5">
              <Alert.Indicator>
                <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
              </Alert.Indicator>
              <Alert.Content>
                <Alert.Title className="text-xs font-bold">Sign-in Successful</Alert.Title>
                <Alert.Description className="text-xs mt-0.5">{successMessage}</Alert.Description>
              </Alert.Content>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="text-xs font-semibold text-foreground/90 block"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted pointer-events-none" />
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  disabled={isLoading}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  placeholder="name@example.com"
                  className={`w-full rounded-xl border bg-surface-secondary/40 pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none transition-all ${
                    fieldErrors.email
                      ? "border-danger focus:ring-1 focus:ring-danger"
                      : "border-border focus:border-accent focus:ring-1 focus:ring-accent"
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-xs text-danger font-medium">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password Field with Show/Hide Toggle */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="text-xs font-semibold text-foreground/90 block"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  disabled={isLoading}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  placeholder="••••••••"
                  className={`w-full rounded-xl border bg-surface-secondary/40 pl-9 pr-10 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none transition-all ${
                    fieldErrors.password
                      ? "border-danger focus:ring-1 focus:ring-danger"
                      : "border-border focus:border-accent focus:ring-1 focus:ring-accent"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-2.5 text-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-danger font-medium">{fieldErrors.password}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              isDisabled={isLoading}
              className="gap-2 font-semibold shadow-sm cursor-pointer mt-2"
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Footer Navigation */}
          <div className="pt-4 border-t border-border/60 text-center space-y-2">
            <p className="text-xs text-muted">
              Don&apos;t have an account yet?{" "}
              <Link
                href="/register"
                className="font-semibold text-accent hover:underline transition-colors"
              >
                Register as a Citizen
              </Link>
            </p>

            <Link
              href="/"
              className="inline-block text-xs text-muted hover:text-foreground transition-colors pt-1"
            >
              ← Back to CivicPulse Home
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
