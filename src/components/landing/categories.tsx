"use client";

import React from "react";
import { Card, Chip } from "@heroui/react";
import {
  Construction,
  Lightbulb,
  Droplets,
  Footprints,
  Trash2,
  Building,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";

export function Categories() {
  const categories = [
    {
      title: "Road Damage",
      description:
        "Potholes, asphalt cracks, asphalt subsidence, dangerous craters, and damaged lane dividers affecting vehicular transit.",
      icon: Construction,
      examples: "Potholes • Subsidence • Road Cracks",
      badge: "High Priority",
      color: "danger" as const,
      sla: "Typical Response: 24–48h",
    },
    {
      title: "Streetlight",
      description:
        "Flickering lights, damaged lighting poles, complete blackout corridors, and faulty photoelectric sensors compromising night safety.",
      icon: Lightbulb,
      examples: "Dark Zones • Blown Bulbs • Damaged Poles",
      badge: "Public Safety",
      color: "warning" as const,
      sla: "Typical Response: 12–24h",
    },
    {
      title: "Drainage",
      description:
        "Blocked stormwater grates, stagnant flood pools, dislodged manhole covers, and urban runoff backups during adverse weather.",
      icon: Droplets,
      examples: "Storm Drains • Manhole Covers • Flooding",
      badge: "Sanitation & Safety",
      color: "accent" as const,
      sla: "Typical Response: 4–12h",
    },
    {
      title: "Footpath",
      description:
        "Broken sidewalk slabs, tactile paving defects, wheelchair accessibility obstacles, and uneven curbs endangering pedestrians.",
      icon: Footprints,
      examples: "Broken Pavement • Obstructions • Curb Ramps",
      badge: "Pedestrian Transit",
      color: "accent" as const,
      sla: "Typical Response: 48–72h",
    },
    {
      title: "Waste Management",
      description:
        "Overflowing public collection receptacles, illegal debris dumpsites, hazardous materials, and missed community waste collections.",
      icon: Trash2,
      examples: "Overflowing Bins • Illegal Dumping • Litter",
      badge: "Environmental",
      color: "success" as const,
      sla: "Typical Response: 8–24h",
    },
    {
      title: "Public Infrastructure",
      description:
        "Damaged commuter bus shelters, broken municipal park benches, vandalized public signage, and deteriorated safety guardrails.",
      icon: Building,
      examples: "Bus Shelters • Park Benches • Railings",
      badge: "Civic Assets",
      color: "default" as const,
      sla: "Typical Response: 3–5 Days",
    },
  ];

  return (
    <section id="categories" className="py-16 sm:py-24 bg-surface-secondary/20 transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Municipal Infrastructure Catalog</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Infrastructure Issue Categories
            </h2>
            <p className="text-base text-muted leading-relaxed">
              CivicPulse standardizes municipal reporting across critical urban sectors, automatically routing tickets to the certified maintenance departments.
            </p>
          </div>

          <a href="#report-cta" className="self-start md:self-auto shrink-0">
            <span className="text-sm font-semibold text-accent hover:underline flex items-center gap-1 cursor-pointer">
              Log an issue in any category →
            </span>
          </a>
        </div>

        {/* 6 Category Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category, idx) => {
            const Icon = category.icon;
            return (
              <Card
                key={idx}
                className="group relative border border-border/80 bg-surface shadow-xs hover:shadow-xl hover:border-accent/50 transition-all duration-200 rounded-2xl p-6 flex flex-col justify-between space-y-5"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="rounded-xl bg-surface-secondary p-3 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors shadow-xs">
                      <Icon className="h-6 w-6" />
                    </div>
                    <Chip color={category.color} variant="soft" size="sm">
                      {category.badge}
                    </Chip>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-lg font-bold text-foreground group-hover:text-accent transition-colors flex items-center justify-between">
                      <span>{category.title}</span>
                      <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-accent" />
                    </h3>
                    <p className="text-xs text-accent font-medium">{category.examples}</p>
                    <p className="text-sm text-muted leading-relaxed pt-1">
                      {category.description}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted">
                  <span className="font-medium text-foreground/80">{category.sla}</span>
                  <span className="font-semibold text-accent group-hover:underline">
                    Report Now
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
