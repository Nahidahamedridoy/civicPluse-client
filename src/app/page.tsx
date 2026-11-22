import React from "react";
import { Hero } from "@/components/landing/hero";
import { Stats } from "@/components/landing/stats";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Categories } from "@/components/landing/categories";
import { Features } from "@/components/landing/features";
import { CtaSection } from "@/components/landing/cta-section";

export default function Home() {
  return (
    <div className="flex flex-col w-full">
      {/* Above-the-fold Hero section with mock operational dashboard */}
      <Hero />

      {/* Demonstration Impact Statistics */}
      <Stats />

      {/* 3-Step Civic Resolution Lifecycle */}
      <HowItWorks />

      {/* Infrastructure Issue Categories */}
      <Categories />

      {/* Platform Features Grid */}
      <Features />

      {/* Citizen Participation Call-to-Action with Interactive Demo Form */}
      <CtaSection />
    </div>
  );
}
