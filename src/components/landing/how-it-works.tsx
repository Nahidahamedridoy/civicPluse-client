"use client";

import React from "react";
import { Card, Chip } from "@heroui/react";
import { Camera, MapPin, Users2, CheckCircle, ArrowRight, Sparkles } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      step: "01",
      title: "Report an Issue",
      description:
        "Citizens capture photographs, specify severity, and submit infrastructure faults with automatic GPS geolocation in under 60 seconds.",
      icon: Camera,
      badge: "Citizen Action",
      color: "accent" as const,
      features: [
        "Automatic GPS geotagging",
        "Photo evidence upload",
        "Category auto-routing",
      ],
      preview: {
        tag: "Mobile Web Submission",
        detail: "Pothole Geotagged • 2 Photos Attached",
        badge: "Verified Location",
      },
    },
    {
      step: "02",
      title: "Department Takes Action",
      description:
        "The responsible municipal agency reviews incoming tickets, verifies jurisdiction, and schedules maintenance field crews based on urgency.",
      icon: Users2,
      badge: "Department Response",
      color: "warning" as const,
      features: [
        "Intelligent department triage",
        "SLA prioritization protocol",
        "Field crew work orders",
      ],
      preview: {
        tag: "Municipal Dispatch",
        detail: "Assigned to Roads Dept • Crew #14 Dispatched",
        badge: "Under Repair",
      },
    },
    {
      step: "03",
      title: "Track Resolution",
      description:
        "Citizens follow real-time progress on public maps, receive timestamped updates, and confirm completion once repairs are validated.",
      icon: CheckCircle,
      badge: "Public Accountability",
      color: "success" as const,
      features: [
        "Live status milestone tracker",
        "Before / after verification",
        "Open civic audit history",
      ],
      preview: {
        tag: "Resolution Complete",
        detail: "Repair Verified • Closed in 2h 45m",
        badge: "Resolved & Inspected",
      },
    },
  ];

  return (
    <section id="how-it-works" className="py-16 sm:py-24 bg-surface transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Transparent 3-Step Lifecycle</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            How CivicPulse Works
          </h2>

          <p className="text-base sm:text-lg text-muted leading-relaxed">
            From initial citizen reporting to public department sign-off, CivicPulse brings
            transparency, accountability, and speed to city maintenance workflows.
          </p>
        </div>

        {/* 3 Steps Grid with Connectors */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="relative flex flex-col">
                {/* Connecting Arrow for Desktop */}
                {index < steps.length - 1 && (
                  <div
                    aria-hidden="true"
                    className="hidden lg:flex absolute top-12 -right-4 z-10 text-muted/40"
                  >
                    <ArrowRight className="h-6 w-6" />
                  </div>
                )}

                <Card className="h-full border border-border/80 bg-surface shadow-xs hover:shadow-lg hover:border-accent/40 transition-all rounded-2xl p-6 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    {/* Header: Step Number & Badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-3xl font-black font-mono text-accent/80 tracking-tighter">
                        {item.step}
                      </span>
                      <Chip color={item.color} variant="soft" size="sm">
                        {item.badge}
                      </Chip>
                    </div>

                    {/* Step Icon & Title */}
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-surface-secondary p-3 text-accent shadow-xs">
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground">
                        {item.title}
                      </h3>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted leading-relaxed">
                      {item.description}
                    </p>

                    {/* Bullet Points */}
                    <ul className="space-y-2 pt-2 border-t border-border/60">
                      {item.features.map((feature, fIdx) => (
                        <li key={fIdx} className="text-xs text-foreground/80 flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Micro Visual Card Mockup for the Step */}
                  <div className="rounded-xl border border-border/80 bg-surface-secondary/40 p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-foreground/80">
                        {item.preview.tag}
                      </span>
                      <span className="text-[10px] font-mono text-accent font-medium">
                        {item.preview.badge}
                      </span>
                    </div>
                    <p className="text-xs text-muted flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span className="truncate">{item.preview.detail}</span>
                    </p>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
