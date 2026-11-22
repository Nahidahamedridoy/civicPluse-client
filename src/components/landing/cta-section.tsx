"use client";

import React, { useState } from "react";
import { Button, Card, Chip } from "@heroui/react";
import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  Camera,
} from "lucide-react";

export function CtaSection() {
  const [selectedCategory, setSelectedCategory] = useState("Road Damage");
  const [locationInput, setLocationInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);

  const categories = [
    "Road Damage",
    "Streetlight",
    "Drainage",
    "Footpath",
    "Waste Management",
    "Public Infrastructure",
  ];

  const handleSimulatedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmittedTicket(`CP-${Math.floor(1000 + Math.random() * 9000)}`);
    }, 700);
  };

  const handleReset = () => {
    setSubmittedTicket(null);
    setLocationInput("");
  };

  return (
    <section id="report-cta" className="relative py-16 sm:py-24 overflow-hidden">
      {/* Decorative Background Glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center opacity-40 blur-3xl"
      >
        <div className="h-96 w-[45rem] bg-gradient-to-tr from-accent/30 via-sky-500/20 to-indigo-600/30 rounded-full" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl border border-border/80 bg-gradient-to-b from-surface via-surface to-surface-secondary/50 p-8 sm:p-12 lg:p-16 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left: Headline & Action copy */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Join Citizen Response Network</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
                Your City. Your Voice.{" "}
                <span className="bg-gradient-to-r from-accent to-sky-500 bg-clip-text text-transparent">
                  Your Impact.
                </span>
              </h2>

              <p className="text-base sm:text-lg text-muted max-w-xl mx-auto lg:mx-0 leading-relaxed">
                A safer, cleaner, and better-maintained city starts with attentive neighbors.
                Every report logged on CivicPulse triggers an accountable response with public progress tracking.
              </p>

              {/* Trust badges */}
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-medium text-muted">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-success" /> 100% Free Public Tool
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-success" /> No App Download Needed
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-success" /> Geotagged Issue Validation
                </span>
              </div>
            </div>

            {/* Right: Interactive Quick Report Box */}
            <div className="lg:col-span-5">
              <Card className="border border-border bg-surface/90 backdrop-blur-md shadow-xl rounded-2xl p-6 transition-all">
                {submittedTicket ? (
                  <div className="text-center py-6 space-y-4 animate-in fade-in zoom-in-95">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success/15 text-success">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <div className="space-y-1">
                      <Chip color="success" variant="soft" size="sm">
                        Simulated Ticket Generated
                      </Chip>
                      <h3 className="text-xl font-bold text-foreground">
                        Report Logged Successfully
                      </h3>
                      <p className="text-xs text-muted">
                        Tracking ID: <span className="font-mono font-bold text-accent">{submittedTicket}</span>
                      </p>
                    </div>

                    <p className="text-xs text-muted max-w-xs mx-auto">
                      In the live platform, this ticket will be dispatched immediately to the municipal agency with GPS telemetry.
                    </p>

                    <Button
                      variant="outline"
                      size="sm"
                      onPress={handleReset}
                      className="cursor-pointer"
                    >
                      Log Another Test Issue
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSimulatedSubmit} className="space-y-4">
                    <div className="flex items-center justify-between border-b border-border/80 pb-3">
                      <div className="flex items-center gap-2">
                        <PlusCircle className="h-4 w-4 text-accent" />
                        <span className="text-sm font-bold text-foreground">
                          Quick Issue Preview
                        </span>
                      </div>
                      <span className="text-[11px] text-muted">Instant Demo</span>
                    </div>

                    {/* Category Selection */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground/90 block">
                        Select Infrastructure Category
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {categories.slice(0, 4).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCategory(cat)}
                            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium text-left transition-all cursor-pointer border ${
                              selectedCategory === cat
                                ? "border-accent bg-accent/10 text-accent font-semibold"
                                : "border-border/70 bg-surface-secondary/40 text-muted hover:text-foreground"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Location Input Field */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground/90 block">
                        Incident Street Address or Landmark
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
                        <input
                          type="text"
                          required
                          value={locationInput}
                          onChange={(e) => setLocationInput(e.target.value)}
                          placeholder="e.g. 5th Avenue & Market Street"
                          className="w-full rounded-xl border border-border bg-surface-secondary/40 pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-all"
                        />
                      </div>
                    </div>

                    {/* Photo attachment mock */}
                    <div className="rounded-xl border border-dashed border-border p-3 text-center bg-surface-secondary/20">
                      <div className="flex items-center justify-center gap-2 text-xs text-muted">
                        <Camera className="h-4 w-4 text-accent" />
                        <span>Optional photo attachment simulated</span>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      fullWidth
                      isDisabled={isSubmitting}
                      className="cursor-pointer font-semibold gap-2 shadow-sm"
                    >
                      {isSubmitting ? "Dispatching..." : "Simulate Issue Report"}
                      <ArrowRight className="h-4 w-4" />
                    </Button>

                    <p className="text-[10px] text-center text-muted">
                      Demonstration test component • No personal data is collected
                    </p>
                  </form>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
