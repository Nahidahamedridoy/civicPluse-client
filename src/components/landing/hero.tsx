"use client";

import React, { useState } from "react";
import { Button, Card, Chip } from "@heroui/react";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Compass,
  MapPin,
  Sparkles,
  Wrench,
  AlertTriangle,
  Radio,
  Check,
} from "lucide-react";

export function Hero() {
  const [activeTab, setActiveTab] = useState<"all" | "active" | "resolved">("all");

  const sampleIssues = [
    {
      id: "CP-4092",
      title: "Deep Pothole & Road Surface Damage",
      location: "Elm St & 4th Avenue • Sector 3",
      department: "Roads & Transit",
      status: "In Progress",
      statusColor: "warning" as const,
      time: "24m ago",
      icon: AlertTriangle,
    },
    {
      id: "CP-4089",
      title: "Flickering Streetlight Cluster",
      location: "Highland Parkway • North District",
      department: "Electrical Utilities",
      status: "Assigned",
      statusColor: "accent" as const,
      time: "1h ago",
      icon: Wrench,
    },
    {
      id: "CP-4075",
      title: "Blocked Storm Drainage Cleared",
      location: "Market Square • Central Zone",
      department: "Water & Sanitation",
      status: "Resolved",
      statusColor: "success" as const,
      time: "2h ago",
      icon: CheckCircle2,
    },
  ];

  const filteredIssues = sampleIssues.filter((issue) => {
    if (activeTab === "active") return issue.status !== "Resolved";
    if (activeTab === "resolved") return issue.status === "Resolved";
    return true;
  });

  return (
    <section className="relative overflow-hidden pt-8 pb-16 md:pt-16 md:pb-24 lg:pt-20 lg:pb-28">
      {/* Background Decorative Ambient Gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
      >
        <div
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-accent/25 to-civic-teal/20 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Hero Copy & Actions */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-accent backdrop-blur-xs">
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-accent" />
              <span>Smart City • Better Tomorrow</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
              Building Smarter Cities,{" "}
              <span className="bg-gradient-to-r from-accent via-sky-500 to-indigo-600 bg-clip-text text-transparent">
                Together.
              </span>
            </h1>

            {/* Supporting Description */}
            <p className="text-lg sm:text-xl text-muted leading-relaxed max-w-2xl mx-auto lg:mx-0">
              CivicPulse connects citizens directly with municipal departments. Report broken
              streetlights, potholes, and drainage hazards in seconds, and monitor repairs from dispatch to verified resolution.
            </p>

            {/* Call To Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4 pt-2">
              <a href="#report-cta" className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  className="gap-2 cursor-pointer shadow-md shadow-accent/20 font-semibold"
                >
                  Report an Issue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </a>

              <a href="#how-it-works" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  fullWidth
                  className="gap-2 cursor-pointer font-medium hover:bg-surface-secondary/70"
                >
                  <Compass className="h-4 w-4 text-accent" />
                  Explore Platform
                </Button>
              </a>
            </div>

            {/* Key Micro-Trust Indicators */}
            <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-y-2 gap-x-6 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-success" /> Geotagged Issue Validation
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-success" /> Public Tracking Records
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-success" /> Real-Time Dept. Dispatch
              </span>
            </div>
          </div>

          {/* Right Column: Visual Product Preview / Mock Dashboard */}
          <div className="lg:col-span-6">
            <div className="relative mx-auto max-w-lg lg:max-w-none">
              {/* Outer decorative glow */}
              <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-r from-accent/30 to-sky-600/30 opacity-70 blur-xl -z-10" />

              {/* Mock Dashboard Window */}
              <Card className="border border-border/80 bg-surface shadow-2xl rounded-2xl overflow-hidden transition-all">
                {/* Window Chrome Header */}
                <div className="border-b border-border bg-surface-secondary/60 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5" aria-hidden="true">
                      <div className="h-3 w-3 rounded-full bg-danger/80" />
                      <div className="h-3 w-3 rounded-full bg-warning/80" />
                      <div className="h-3 w-3 rounded-full bg-success/80" />
                    </div>
                    <span className="text-xs font-semibold text-muted ml-2">
                      CivicPulse Operational Command
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                    </span>
                    <span className="text-[11px] font-medium text-success">Live Network</span>
                  </div>
                </div>

                {/* Dashboard Subheader & Stats Bar */}
                <div className="p-4 bg-surface-secondary/20 border-b border-border space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-accent" />
                      <span className="text-xs font-semibold text-foreground">
                        Municipal District Central • Sector 4
                      </span>
                    </div>
                    <Chip color="default" variant="soft" size="sm" className="text-[10px]">
                      GPS: 37.7749° N, 122.4194° W
                    </Chip>
                  </div>

                  {/* Micro metric pill cards */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="rounded-lg border border-border/70 bg-surface p-2 text-center">
                      <span className="text-[10px] uppercase font-bold text-muted block">
                        Today&apos;s Reports
                      </span>
                      <span className="text-sm font-extrabold text-foreground">42 Logged</span>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-surface p-2 text-center">
                      <span className="text-[10px] uppercase font-bold text-muted block">
                        Resolution Rate
                      </span>
                      <span className="text-sm font-extrabold text-success">96.4%</span>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-surface p-2 text-center">
                      <span className="text-[10px] uppercase font-bold text-muted block">
                        Avg Dispatch
                      </span>
                      <span className="text-sm font-extrabold text-accent">32 mins</span>
                    </div>
                  </div>
                </div>

                {/* Mock Live Incident Feed */}
                <Card.Content className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Radio className="h-4 w-4 text-accent animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-wider text-muted">
                        Incident Activity Stream
                      </span>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-1 bg-surface-secondary/80 p-0.5 rounded-lg text-[11px]">
                      <button
                        onClick={() => setActiveTab("all")}
                        className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                          activeTab === "all"
                            ? "bg-surface text-foreground shadow-xs"
                            : "text-muted hover:text-foreground"
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setActiveTab("active")}
                        className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                          activeTab === "active"
                            ? "bg-surface text-foreground shadow-xs"
                            : "text-muted hover:text-foreground"
                        }`}
                      >
                        Active
                      </button>
                      <button
                        onClick={() => setActiveTab("resolved")}
                        className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                          activeTab === "resolved"
                            ? "bg-surface text-foreground shadow-xs"
                            : "text-muted hover:text-foreground"
                        }`}
                      >
                        Resolved
                      </button>
                    </div>
                  </div>

                  {/* List of Issues */}
                  <div className="space-y-2">
                    {filteredIssues.map((issue) => {
                      const Icon = issue.icon;
                      return (
                        <div
                          key={issue.id}
                          className="group rounded-xl border border-border/70 bg-surface-secondary/30 p-3 transition-all hover:bg-surface-secondary/70 hover:border-accent/40"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5">
                              <div className="mt-0.5 rounded-lg bg-surface p-1.5 text-accent shadow-xs">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-foreground">
                                    {issue.title}
                                  </span>
                                  <span className="text-[10px] font-mono text-muted">
                                    {issue.id}
                                  </span>
                                </div>
                                <p className="text-[11px] text-muted flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-muted/70 inline" />
                                  {issue.location}
                                </p>
                              </div>
                            </div>

                            <Chip color={issue.statusColor} variant="soft" size="sm">
                              {issue.status}
                            </Chip>
                          </div>

                          <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between text-[10px] text-muted">
                            <span className="font-medium text-foreground/80">
                              Dept: {issue.department}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {issue.time}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card.Content>

                {/* Dashboard Footer */}
                <div className="px-4 py-2.5 bg-surface-secondary/40 border-t border-border flex items-center justify-between text-xs text-muted">
                  <span className="text-[11px]">Simulated live municipal demo view</span>
                  <span className="text-[11px] font-medium text-accent hover:underline cursor-pointer">
                    View Complete Audit Log →
                  </span>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
