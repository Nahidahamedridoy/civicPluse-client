"use client";

import React from "react";
import Link from "next/link";
import { Chip } from "@heroui/react";
import { Home, Activity, List, FileText, User, LogIn, LogOut, Heart, ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-surface-secondary/40 py-12 transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & Purpose */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground shadow-xs">
                <Activity className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold tracking-tight text-foreground">
                Civic<span className="text-accent">Pulse</span>
              </span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Smart city infrastructure and transparent incident resolution for citizens and municipal teams.
            </p>
            <div className="pt-1">
              <Chip color="success" variant="soft" size="sm">
                <ShieldCheck className="h-3 w-3 mr-1 inline" /> GovTech Prototype
              </Chip>
            </div>
          </div>

          {/* Column 1: Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs text-muted">
              <li>
                <Link href="/" className="flex items-center gap-1 hover:text-foreground transition-colors">
                  <Home className="h-3 w-3" /> Home
                </Link>
              </li>
              <li>
                <Link href="/citizen/dashboard" className="flex items-center gap-1 hover:text-foreground transition-colors">
                  <Activity className="h-3 w-3" /> Dashboard
                </Link>
              </li>
              <li>
                <Link href="/citizen/my-reports" className="flex items-center gap-1 hover:text-foreground transition-colors">
                  <List className="h-3 w-3" /> My Reports
                </Link>
              </li>
              <li>
                <Link href="/citizen/report-issue" className="flex items-center gap-1 hover:text-foreground transition-colors">
                  <FileText className="h-3 w-3" /> Report Issue
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Platform Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Platform
            </h4>
            <ul className="space-y-2 text-xs text-muted">
              <li>
                <Link href="/citizen/report-issue" className="flex items-center gap-1 hover:text-foreground transition-colors">
                  <FileText className="h-3 w-3" /> Report an Issue
                </Link>
              </li>
              <li>
                <Link href="/citizen/my-reports" className="flex items-center gap-1 hover:text-foreground transition-colors">
                  <List className="h-3 w-3" /> My Reports
                </Link>
              </li>
              <li>
                <Link href="/login" className="flex items-center gap-1 hover:text-foreground transition-colors">
                  <LogIn className="h-3 w-3" /> Login
                </Link>
              </li>
              <li>
                <Link href="/register" className="flex items-center gap-1 hover:text-foreground transition-colors">
                  <User className="h-3 w-3" /> Register
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Infrastructure Categories */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Categories
            </h4>
            <ul className="space-y-2 text-xs text-muted">
              <li>
                <Link href="#categories" className="hover:text-foreground transition-colors">
                  Road Damage & Potholes
                </Link>
              </li>
              <li>
                <Link href="#categories" className="hover:text-foreground transition-colors">
                  Streetlights & Dark Zones
                </Link>
              </li>
              <li>
                <Link href="#categories" className="hover:text-foreground transition-colors">
                  Storm Drainage & Flooding
                </Link>
              </li>
              <li>
                <Link href="#categories" className="hover:text-foreground transition-colors">
                  Footpaths & Accessibility
                </Link>
              </li>
              <li>
                <Link href="#categories" className="hover:text-foreground transition-colors">
                  Waste Management
                </Link>
              </li>
            </ul>
          </div>
          
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <p>© {new Date().getFullYear()} CivicPulse. All rights reserved.</p>

          <div className="flex items-center gap-2">
            <span>Built with</span>
            <Heart className="h-3.5 w-3.5 text-danger fill-danger" />
            <span>for resilient, transparent communities</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
