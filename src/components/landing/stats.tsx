"use client";

import React from "react";
import { Card, Chip } from "@heroui/react";
import {
  CheckCircle2,
  Clock,
  Building2,
  FileSpreadsheet,
  Info,
  TrendingUp,
} from "lucide-react";

export function Stats() {
  const stats = [
    {
      label: "Total Issues Reported",
      value: "12,480+",
      trend: "+14% this quarter",
      description: "Infrastructure incidents cataloged across municipal sectors",
      icon: FileSpreadsheet,
      badgeColor: "accent" as const,
    },
    {
      label: "Issues Resolved",
      value: "96.8%",
      trend: "Above 95% SLA target",
      description: "Successfully inspected, repaired, and citizen-verified",
      icon: CheckCircle2,
      badgeColor: "success" as const,
    },
    {
      label: "Active Departments",
      value: "18",
      trend: "Full municipal coverage",
      description: "Public works, electrical, water, sanitation, and parks",
      icon: Building2,
      badgeColor: "accent" as const,
    },
    {
      label: "Average Resolution Time",
      value: "3.2 hrs",
      trend: "48% faster than baseline",
      description: "From citizen submission to dispatched crew completion",
      icon: Clock,
      badgeColor: "warning" as const,
    },
  ];

  return (
    <section id="stats" className="py-12 sm:py-16 bg-surface-secondary/30 border-y border-border/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Section Header with Demo Label */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-accent">
                Platform Performance
              </span>
              <Chip color="default" variant="soft" size="sm" className="text-[10px]">
                <Info className="h-3 w-3 mr-1 inline" /> Demonstration Sample Data
              </Chip>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Measurable Civic Impact
            </h2>
            <p className="text-sm sm:text-base text-muted max-w-xl">
              Simulated indicators demonstrating how civic transparency accelerates municipal repair cycles and improves urban reliability.
            </p>
          </div>

          <div className="text-xs text-muted flex items-center gap-1.5 self-start md:self-auto">
            <span className="h-2 w-2 rounded-full bg-accent inline-block" />
            <span>Sample metrics calculated over 90-day simulation</span>
          </div>
        </div>

        {/* 4 Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <Card
                key={idx}
                className="border border-border/80 bg-surface shadow-xs hover:shadow-md hover:border-accent/40 transition-all rounded-xl p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="rounded-xl bg-surface-secondary p-2.5 text-accent">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Chip color={stat.badgeColor} variant="soft" size="sm" className="text-[10px]">
                    <TrendingUp className="h-3 w-3 mr-1 inline" />
                    {stat.trend}
                  </Chip>
                </div>

                <div>
                  <div className="text-3xl font-extrabold text-foreground tracking-tight">
                    {stat.value}
                  </div>
                  <div className="text-sm font-semibold text-foreground/90 mt-0.5">
                    {stat.label}
                  </div>
                </div>

                <p className="text-xs text-muted leading-relaxed border-t border-border/60 pt-2.5">
                  {stat.description}
                </p>
              </Card>
            );
          })}
        </div>

        {/* Footnote clearly reinforcing demonstration values */}
        <p className="text-center text-xs text-muted">
          * Note: The statistics displayed above represent demo performance benchmarks designed for platform demonstration purposes.
        </p>
      </div>
    </section>
  );
}
