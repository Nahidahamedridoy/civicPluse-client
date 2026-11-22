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
  User as UserIcon,
  Phone,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  Info,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Email regex matching the backend User model schema
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const validate = (): boolean => {
    const errors: {
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!name.trim()) {
      errors.name = "Full name is required.";
    } else if (name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters long.";
    } else if (name.trim().length > 100) {
      errors.name = "Name cannot exceed 100 characters.";
    }

    if (!email.trim()) {
      errors.email = "Email address is required.";
    } else if (!emailRegex.test(email.trim())) {
      errors.email = "Please provide a valid email address.";
    }

    if (phone.trim() && phone.trim().length < 7) {
      errors.phone = "Please enter a valid phone number.";
    }

    if (!password) {
      errors.password = "Password is required.";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters long.";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Confirm password is required.";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
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
      // Public registration always creates a citizen account (Requirement 4)
      const result = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() ? phone.trim() : undefined,
      });

      setSuccessMessage(
        `Welcome to CivicPulse, ${result.user.name}! Your Citizen account is ready. Redirecting...`
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
        setErrorMessage("An unexpected registration error occurred.");
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg space-y-6">
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
            <Chip color="success" variant="soft" size="sm">
              <ShieldCheck className="h-3 w-3 mr-1 inline" /> Public Citizen Registration
            </Chip>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Create Citizen Account
          </h1>
          <p className="text-sm text-muted">
            Report infrastructure hazards, track repairs in real-time, and shape your city.
          </p>
        </div>

        {/* Card Form */}
        <Card className="border border-border/80 bg-surface shadow-xl rounded-2xl p-6 sm:p-8 space-y-6 transition-colors">
          {/* Policy Notice: Citizen-only Public Registration */}
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-3.5 flex items-start gap-2.5 text-xs text-muted">
            <Info className="h-4 w-4 text-accent shrink-0 mt-0.5" />
            <p>
              <strong className="text-foreground font-semibold">Citizen Access:</strong> Public
              registration is exclusively for citizen accounts. Department managers, staff, and
              administrators are provisioned directly by municipal department IT.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <Alert className="border border-danger/40 bg-danger/10 text-danger rounded-xl p-3.5">
              <Alert.Indicator>
                <AlertCircle className="h-5 w-5 text-danger shrink-0" />
              </Alert.Indicator>
              <Alert.Content>
                <Alert.Title className="text-xs font-bold">Registration Error</Alert.Title>
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
                <Alert.Title className="text-xs font-bold">Registration Complete</Alert.Title>
                <Alert.Description className="text-xs mt-0.5">{successMessage}</Alert.Description>
              </Alert.Content>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Full Name Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="register-name"
                className="text-xs font-semibold text-foreground/90 block"
              >
                Full Name <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted pointer-events-none" />
                <input
                  id="register-name"
                  type="text"
                  name="name"
                  autoComplete="name"
                  disabled={isLoading}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) {
                      setFieldErrors((prev) => ({ ...prev, name: undefined }));
                    }
                  }}
                  placeholder="Jane Citizen"
                  className={`w-full rounded-xl border bg-surface-secondary/40 pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none transition-all ${
                    fieldErrors.name
                      ? "border-danger focus:ring-1 focus:ring-danger"
                      : "border-border focus:border-accent focus:ring-1 focus:ring-accent"
                  }`}
                />
              </div>
              {fieldErrors.name && (
                <p className="text-xs text-danger font-medium">{fieldErrors.name}</p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="register-email"
                className="text-xs font-semibold text-foreground/90 block"
              >
                Email Address <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted pointer-events-none" />
                <input
                  id="register-email"
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
                  placeholder="jane.citizen@example.com"
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

            {/* Phone Number Field (Optional) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="register-phone"
                  className="text-xs font-semibold text-foreground/90 block"
                >
                  Phone Number
                </label>
                <span className="text-[10px] text-muted">Optional</span>
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted pointer-events-none" />
                <input
                  id="register-phone"
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  disabled={isLoading}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (fieldErrors.phone) {
                      setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                    }
                  }}
                  placeholder="+1 (555) 019-2834"
                  className="w-full rounded-xl border border-border bg-surface-secondary/40 pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-all"
                />
              </div>
              {fieldErrors.phone && (
                <p className="text-xs text-danger font-medium">{fieldErrors.phone}</p>
              )}
            </div>

            {/* Password & Confirm Password Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="register-password"
                  className="text-xs font-semibold text-foreground/90 block"
                >
                  Password <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted pointer-events-none" />
                  <input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="new-password"
                    disabled={isLoading}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) {
                        setFieldErrors((prev) => ({ ...prev, password: undefined }));
                      }
                    }}
                    placeholder="Min. 6 chars"
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
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-xs text-danger font-medium">{fieldErrors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="register-confirm-password"
                  className="text-xs font-semibold text-foreground/90 block"
                >
                  Confirm Password <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted pointer-events-none" />
                  <input
                    id="register-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    autoComplete="new-password"
                    disabled={isLoading}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (fieldErrors.confirmPassword) {
                        setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                      }
                    }}
                    placeholder="Re-enter password"
                    className={`w-full rounded-xl border bg-surface-secondary/40 pl-9 pr-10 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none transition-all ${
                      fieldErrors.confirmPassword
                        ? "border-danger focus:ring-1 focus:ring-danger"
                        : "border-border focus:border-accent focus:ring-1 focus:ring-accent"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-2.5 text-muted hover:text-foreground transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-xs text-danger font-medium">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              isDisabled={isLoading}
              className="gap-2 font-semibold shadow-sm cursor-pointer mt-3"
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating Citizen Account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>Complete Citizen Registration</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Footer Navigation */}
          <div className="pt-4 border-t border-border/60 text-center space-y-2">
            <p className="text-xs text-muted">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-accent hover:underline transition-colors"
              >
                Sign in to your account
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
