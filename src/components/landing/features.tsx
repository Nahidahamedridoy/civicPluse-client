"use client";

import React from "react";
import { Card, Chip } from "@heroui/react";
import {
  MapPin,
  Eye,
  ShieldCheck,
  BellRing,
  Wrench,
  BarChart3,
  Sparkles,
} from "lucide-react";

export function Features() {
  const features = [
    {
      title: "GPS-Based Location Reporting",
      description:
        "Pinpoint problem sites with pinpoint satellite precision. Automatic geotagging prevents duplicate tickets and pinpoints exact street segments for field crews.",
      icon: MapPin,
      badge: "Geospatial Precision",
    },
    {
      title: "Transparent Issue Tracking",
      description:
        "Public audit trail for all municipal complaints. Track timestamped status changes from ticket intake, inspector review, through final resolution.",
      icon: Eye,
      badge: "Open Governance",
    },
    {
      title: "Department Accountability",
      description:
        "Tickets automatically routed to jurisdictional agencies with binding service-level time commitments and transparent performance benchmarks.",
      icon: ShieldCheck,
      badge: "Strict SLA",
    },
    {
      title: "Real-Time Status Updates",
      description:
        "Citizens receive instant notifications when crews are dispatched, work begins, and before-and-after photographic evidence is certified.",
      icon: BellRing,
      badge: "Live Telemetry",
    },
    {
      title: "Organized Maintenance Workflow",
      description:
        "Equips municipal crews with digital dispatch itineraries, material inventory tracking, and standardized mobile resolution validation.",
      icon: Wrench,
      badge: "Operations Engine",
    },
    {
      title: "Performance Analytics",
      description:
        "Data-driven dashboards highlight chronic infrastructure failure hotspots, seasonal damage trends, and resource allocation efficiency.",
      icon: BarChart3,
      badge: "Urban Intelligence",
    },
  ];

  return (
    <section id="features" className="py-16 sm:py-24 bg-surface transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Modern GovTech Capabilities</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Engineered for Modern City Management
          </h2>

          <p className="text-base sm:text-lg text-muted leading-relaxed">
            CivicPulse unifies citizen mobile input with municipal enterprise work-order management
            into a single, highly performant civic infrastructure ecosystem.
          </p>
        </div>

        {/* 6 Features 2x3 or 3x2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <Card
                key={idx}
                className="group border border-border/80 bg-surface shadow-xs hover:shadow-lg hover:border-accent/40 transition-all rounded-2xl p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="rounded-xl bg-surface-secondary p-3 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors shadow-xs">
                    <Icon className="h-6 w-6" />
                  </div>
                  <Chip color="accent" variant="soft" size="sm" className="text-[10px]">
                    {feature.badge}
                  </Chip>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-foreground group-hover:text-accent transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
