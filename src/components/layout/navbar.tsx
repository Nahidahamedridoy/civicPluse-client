"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button, Chip } from "@heroui/react";
import { Activity, Menu, ShieldCheck, X, PlusCircle, LogIn, LogOut, UserCircle } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "@/context/auth-context";
import { getDashboardPath, getRoleLabel } from "@/lib/auth";

const NAV_LINKS = [
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Categories", href: "/#categories" },
  { label: "Features", href: "/#features" },
  { label: "Impact", href: "/#stats" },
];

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-surface/85 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-sm group-hover:scale-105 transition-transform">
              <Activity className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-foreground">
                Civic<span className="text-accent">Pulse</span>
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted -mt-1">
                Smart City Infrastructure
              </span>
            </div>
          </Link>

          <Chip
            color="accent"
            variant="soft"
            size="sm"
            className="hidden md:inline-flex"
          >
            <ShieldCheck className="h-3 w-3 mr-1 inline" /> Citizen Platform
          </Chip>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-surface-secondary/60"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-2.5">
          <ThemeToggle />

          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <Link href={getDashboardPath(user.role)}>
                <Button variant="secondary" size="sm" className="gap-1.5 cursor-pointer font-medium">
                  <UserCircle className="h-4 w-4 text-accent" />
                  <span className="max-w-[120px] truncate">{user.name}</span>
                  <Chip color="accent" variant="soft" size="sm" className="text-[10px] uppercase">
                    {getRoleLabel(user.role)}
                  </Chip>
                </Button>
              </Link>
              <Button
                variant="ghost"
                isIconOnly
                size="sm"
                onPress={logout}
                aria-label="Sign out"
                className="cursor-pointer text-muted hover:text-danger"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm" className="gap-1 cursor-pointer font-medium">
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Button>
              </Link>
              <a href="/#report-cta">
                <Button variant="primary" size="sm" className="gap-1.5 cursor-pointer font-medium shadow-xs">
                  <PlusCircle className="h-4 w-4" />
                  Report an Issue
                </Button>
              </a>
            </>
          )}
        </div>

        {/* Mobile Menu Trigger & Theme Toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <Button
            variant="ghost"
            isIconOnly
            size="sm"
            onPress={toggleMobileMenu}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            className="cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-surface px-4 pt-2 pb-6 space-y-3 shadow-lg transition-all animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-col space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMobileMenu}
                className="text-base font-medium text-foreground/80 hover:text-foreground hover:bg-surface-secondary/80 px-3 py-2.5 rounded-lg transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="pt-2 border-t border-border flex flex-col gap-2">
            {isAuthenticated && user ? (
              <>
                <Link
                  href={getDashboardPath(user.role)}
                  onClick={closeMobileMenu}
                  className="w-full"
                >
                  <Button variant="secondary" size="md" fullWidth className="gap-1.5 cursor-pointer font-medium justify-between">
                    <span className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-accent" />
                      <span>{user.name}</span>
                    </span>
                    <Chip color="accent" variant="soft" size="sm" className="text-[10px] uppercase">
                      {getRoleLabel(user.role)}
                    </Chip>
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="md"
                  fullWidth
                  onPress={() => {
                    logout();
                    closeMobileMenu();
                  }}
                  className="gap-1.5 cursor-pointer font-medium text-danger hover:bg-danger/10"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={closeMobileMenu} className="w-full">
                  <Button variant="outline" size="md" fullWidth className="gap-1.5 cursor-pointer font-medium">
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </Button>
                </Link>
                <a href="/#report-cta" onClick={closeMobileMenu} className="w-full">
                  <Button variant="primary" size="md" fullWidth className="gap-1.5 cursor-pointer font-medium">
                    <PlusCircle className="h-4 w-4" />
                    Report an Issue
                  </Button>
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
