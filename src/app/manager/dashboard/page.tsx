"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Chip, Alert } from "@heroui/react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Briefcase,
  Building,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Filter,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Phone,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  User,
  Users,
  Wrench,
  X,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { getDashboardPath, getRoleLabel } from "@/lib/auth";
import {
  CitizenIssue,
  DepartmentWorkloadData,
  ManagerDashboardData,
  fetchDepartmentWorkload,
  fetchManagerDashboard,
  getPriorityMeta,
  getStatusMeta,
} from "@/lib/manager-api";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { IssueDetailsModal } from "@/components/citizen/issue-details-modal";

export default function ManagerDashboardPage() {
  const router = useRouter();
  const { user, token, role, isAuthenticated, isMounted, logout } = useAuth();

  // Navigation & Mobile drawer
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Modals state
  const [selectedIssue, setSelectedIssue] = useState<CitizenIssue | null>(null);

  // Data & loading states
  const [dashboardData, setDashboardData] = useState<ManagerDashboardData | null>(null);
  const [workloadData, setWorkloadData] = useState<DepartmentWorkloadData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Route protection
  useEffect(() => {
    if (!isMounted) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    const normalizedRole = role?.toLowerCase().trim();
    if (normalizedRole && normalizedRole !== "department_manager" && normalizedRole !== "manager") {
      router.replace(getDashboardPath(role || undefined));
    }
  }, [isMounted, isAuthenticated, role, router]);

  // Load data function
  const loadDashboardData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [dashRes, workloadRes] = await Promise.all([
        fetchManagerDashboard(token),
        fetchDepartmentWorkload(token),
      ]);

      setDashboardData(dashRes);
      setWorkloadData(workloadRes);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An unexpected error occurred while loading dashboard data.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Initial fetch on mount
  useEffect(() => {
    if (!isMounted || !isAuthenticated || !token) return;

    const normalizedRole = role?.toLowerCase().trim();
    if (normalizedRole !== "department_manager" && normalizedRole !== "manager") return;

    loadDashboardData();
  }, [isMounted, isAuthenticated, role, token, loadDashboardData]);

  const summary = dashboardData?.summary || {
    totalIssues: 0,
    pendingIssues: 0,
    inProgressIssues: 0,
    resolvedIssues: 0,
    staffCount: 0,
  };

  const recentIssues = dashboardData?.recentIssues || [];
  const departmentInfo = workloadData?.department;
  const staffWorkload = workloadData?.staffWorkload || [];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row transition-colors">
      {/* =========================================================================
          1. Sidebar Navigation (Desktop & Mobile Drawer)
          ========================================================================= */}
      {/* Mobile Drawer Backdrop */}
      {mobileSidebarOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close mobile sidebar backdrop"
          onClick={() => setMobileSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setMobileSidebarOpen(false);
          }}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden cursor-pointer"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-surface flex flex-col justify-between transition-transform duration-200 md:static md:translate-x-0 ${
          mobileSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="space-y-6 p-5">
          {/* Brand Header */}
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-xs group-hover:scale-105 transition-transform">
                <Activity className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight text-foreground">
                  Civic<span className="text-accent">Pulse</span>
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted -mt-0.5">
                  Manager Portal
                </span>
              </div>
            </Link>

            {/* Mobile close button */}
            <Button
              variant="ghost"
              isIconOnly
              size="sm"
              onPress={() => setMobileSidebarOpen(false)}
              aria-label="Close navigation"
              className="md:hidden cursor-pointer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-px bg-border/80" />

          {/* Department Tag / Badge in Sidebar */}
          {departmentInfo && (
            <div className="px-3 py-2 rounded-xl bg-surface-secondary/70 border border-border/60">
              <span className="text-[10px] uppercase font-bold text-muted block">
                Department
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Building className="h-3.5 w-3.5 text-accent shrink-0" />
                <span className="text-xs font-semibold text-foreground truncate">
                  {departmentInfo.name}
                </span>
                <span className="text-[10px] font-mono text-muted ml-auto uppercase">
                  {departmentInfo.code}
                </span>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1">
            <Link
              href="/manager/dashboard"
              onClick={() => setMobileSidebarOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold bg-accent text-accent-foreground shadow-xs transition-all cursor-pointer"
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              <span>Overview</span>
            </Link>

            <Link
              href="/manager/issues"
              onClick={() => setMobileSidebarOpen(false)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-secondary/70 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-4 w-4 shrink-0 group-hover:text-accent transition-colors" />
                <span>Issue Management</span>
              </div>
              {summary.totalIssues > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-surface-secondary text-muted group-hover:bg-accent/20 group-hover:text-accent transition-colors">
                  {summary.totalIssues}
                </span>
              )}
            </Link>

            <Link
              href="/manager/team"
              onClick={() => setMobileSidebarOpen(false)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-secondary/70 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 shrink-0 group-hover:text-accent transition-colors" />
                <span>Team Management</span>
              </div>
              {summary.staffCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-surface-secondary text-muted group-hover:bg-accent/20 group-hover:text-accent transition-colors">
                  {summary.staffCount}
                </span>
              )}
            </Link>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border space-y-3 bg-surface-secondary/20">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-bold text-xs shrink-0">
              {user?.name?.charAt(0).toUpperCase() || "M"}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-foreground truncate">
                {user?.name}
              </span>
              <span className="text-[10px] text-muted truncate">{user?.email}</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-border/60">
            <Link
              href="/"
              className="text-[11px] text-muted hover:text-foreground transition-colors flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" /> Public Home
            </Link>

            <button
              onClick={logout}
              className="text-[11px] text-danger hover:underline font-medium flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="h-3 w-3" /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          2. Main Content Area & Topbar
          ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-16 border-b border-border bg-surface/85 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              isIconOnly
              size="sm"
              onPress={() => setMobileSidebarOpen(true)}
              aria-label="Open sidebar navigation"
              className="md:hidden cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-foreground">
                  Department Manager Dashboard
                </h1>
                {departmentInfo && (
                  <Chip color="accent" variant="soft" size="sm" className="hidden sm:inline-flex text-[10px]">
                    {departmentInfo.name}
                  </Chip>
                )}
              </div>
              <p className="text-[10px] text-muted hidden sm:block">
                Municipal Operations • Team Workload & Incident Oversight
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Refresh action */}
            <Button
              variant="ghost"
              isIconOnly
              size="sm"
              onPress={loadDashboardData}
              isDisabled={isLoading}
              aria-label="Refresh dashboard data"
              className="cursor-pointer text-muted hover:text-foreground"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>

            {/* Theme Toggle */}
            <ThemeToggle />

            <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />

            {/* Manager chip */}
            <Chip color="accent" variant="soft" size="sm" className="hidden sm:inline-flex">
              <ShieldCheck className="h-3 w-3 mr-1 inline" /> Department Manager
            </Chip>
          </div>
        </header>

        {/* Dashboard Body Content */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-8 flex-1">
          {/* Error Banner with Retry State */}
          {errorMessage && (
            <Alert className="border border-danger/40 bg-danger/10 text-danger rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 sm:mt-0" />
                <div className="text-xs">
                  <span className="font-bold block">Unable to load department dashboard</span>
                  <span>{errorMessage}</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onPress={loadDashboardData}
                className="cursor-pointer text-xs shrink-0"
              >
                Retry
              </Button>
            </Alert>
          )}

          {/* Welcome & Department Overview Banner */}
          <div className="rounded-2xl border border-border bg-gradient-to-r from-surface via-surface to-accent/5 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Chip color="accent" variant="soft" size="sm">
                  {departmentInfo ? `${departmentInfo.name} (${departmentInfo.code})` : "Department Operations"}
                </Chip>
                <span className="text-xs text-muted">Manager Access</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Welcome back, {user?.name}!
              </h2>
              <p className="text-sm text-muted max-w-xl leading-relaxed">
                Oversee department incidents, monitor crew workload distribution, and prioritize
                essential repairs across your municipal sector.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link href="/manager/issues">
                <Button
                  variant="primary"
                  size="md"
                  className="gap-2 font-semibold shadow-xs cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Manage Issues
                </Button>
              </Link>

              <Link href="/manager/team">
                <Button
                  variant="outline"
                  size="md"
                  className="gap-2 cursor-pointer font-medium"
                >
                  <Users className="h-4 w-4 text-accent" />
                  Team Management
                </Button>
              </Link>
            </div>
          </div>

          {/* =====================================================================
              Feature 1: Department-Specific Statistics (4 KPI Cards)
              ===================================================================== */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                Department Performance Metrics
              </h3>
              {isLoading && (
                <span className="text-xs text-muted flex items-center gap-1.5">
                  <RefreshCw className="h-3 w-3 animate-spin" /> Updating stats...
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* 1. Total Issues */}
              <Card className="border border-border bg-surface p-5 rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted">
                    Total Issues
                  </span>
                  <div className="rounded-xl bg-surface-secondary p-2 text-accent">
                    <FileText className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-black text-foreground">
                    {isLoading ? "--" : summary.totalIssues}
                  </div>
                  <span className="text-xs text-muted">All department submissions</span>
                </div>
              </Card>

              {/* 2. Pending Issues */}
              <Card className="border border-border bg-surface p-5 rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-warning">
                    Pending
                  </span>
                  <div className="rounded-xl bg-warning/15 p-2 text-warning">
                    <Clock className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-black text-foreground">
                    {isLoading ? "--" : summary.pendingIssues}
                  </div>
                  <span className="text-xs text-muted">Awaiting triage & assignment</span>
                </div>
              </Card>

              {/* 3. In Progress */}
              <Card className="border border-border bg-surface p-5 rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-accent">
                    In Progress
                  </span>
                  <div className="rounded-xl bg-accent/15 p-2 text-accent">
                    <Wrench className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-black text-foreground">
                    {isLoading ? "--" : summary.inProgressIssues}
                  </div>
                  <span className="text-xs text-muted">Assigned & actively repaired</span>
                </div>
              </Card>

              {/* 4. Resolved */}
              <Card className="border border-border bg-surface p-5 rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-success">
                    Resolved
                  </span>
                  <div className="rounded-xl bg-success/15 p-2 text-success">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-black text-foreground">
                    {isLoading ? "--" : summary.resolvedIssues}
                  </div>
                  <span className="text-xs text-muted">Repairs closed & verified</span>
                </div>
              </Card>
            </div>
          </div>

          {/* =====================================================================
              Feature 4: Quick Links to Management Pages
              ===================================================================== */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
              Quick Management Shortcuts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/manager/issues" className="block group">
                <Card className="border border-border bg-surface hover:border-accent/50 p-5 rounded-2xl shadow-xs transition-all group-hover:shadow-md h-full">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 rounded-xl bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                        <FileSpreadsheet className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground group-hover:text-accent transition-colors">
                          Issue Management
                        </h4>
                        <p className="text-xs text-muted mt-0.5">
                          Triage reported incidents, verify field conditions, and dispatch maintenance crew
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                  </div>
                </Card>
              </Link>

              <Link href="/manager/team" className="block group">
                <Card className="border border-border bg-surface hover:border-accent/50 p-5 rounded-2xl shadow-xs transition-all group-hover:shadow-md h-full">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 rounded-xl bg-surface-secondary text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                        <Users className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground group-hover:text-accent transition-colors">
                          Team Management
                        </h4>
                        <p className="text-xs text-muted mt-0.5">
                          Monitor maintenance crew members, inspect workload allocations, and manage staff
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                  </div>
                </Card>
              </Link>
            </div>
          </div>

          {/* =====================================================================
              Feature 2: Recent Department Issues
              ===================================================================== */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Recent Department Issues
                </h3>
                <p className="text-xs text-muted">
                  Latest incident submissions assigned to your department
                </p>
              </div>

              {recentIssues.length > 0 && (
                <Link href="/manager/issues">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-accent hover:underline cursor-pointer gap-1"
                  >
                    View All in Issue Management <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              )}
            </div>

            {/* Table, Loading or Empty State */}
            {isLoading ? (
              <div className="rounded-2xl border border-border bg-surface p-12 text-center space-y-3">
                <span className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin inline-block" />
                <p className="text-xs text-muted">Loading department issues...</p>
              </div>
            ) : recentIssues.length === 0 ? (
              /* Empty state */
              <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-surface-secondary text-muted flex items-center justify-center mx-auto">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-foreground">
                    No Department Issues Found
                  </h4>
                  <p className="text-xs text-muted max-w-sm mx-auto">
                    There are currently no active or historical issues reported under your department.
                  </p>
                </div>
                <Link href="/manager/issues">
                  <Button variant="outline" size="sm" className="cursor-pointer gap-1.5 text-xs">
                    <FileText className="h-4 w-4" /> Check Issue Registry
                  </Button>
                </Link>
              </div>
            ) : (
              /* Responsive Table */
              <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-secondary/50 border-b border-border text-muted font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Title & ID</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Priority</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Reported Date</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {recentIssues.map((item) => {
                        const statusMeta = getStatusMeta(item.status);
                        const priorityMeta = getPriorityMeta(item.priority);
                        const formattedDate = new Date(item.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        );

                        return (
                          <tr
                            key={item._id}
                            className="hover:bg-surface-secondary/40 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="font-semibold text-foreground text-xs line-clamp-1">
                                {item.title}
                              </div>
                              <span className="font-mono text-[10px] text-muted">
                                #{item._id.slice(-6).toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-muted font-medium">
                              {item.category}
                            </td>
                            <td className="py-3 px-4">
                              <Chip color={priorityMeta.color} variant="secondary" size="sm">
                                {priorityMeta.label}
                              </Chip>
                            </td>
                            <td className="py-3 px-4">
                              <Chip color={statusMeta.color} variant="soft" size="sm">
                                {statusMeta.label}
                              </Chip>
                            </td>
                            <td className="py-3 px-4 text-muted whitespace-nowrap">
                              {formattedDate}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onPress={() => setSelectedIssue(item)}
                                className="cursor-pointer text-xs font-semibold text-accent hover:bg-accent/10"
                              >
                                View Details
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* =====================================================================
              Feature 3: Assigned Staff and Workload Summary (when supported)
              ===================================================================== */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Assigned Staff & Workload Distribution
                </h3>
                <p className="text-xs text-muted">
                  Maintenance crew capacity, active repairs, and task allocation
                </p>
              </div>

              {staffWorkload.length > 0 && (
                <Link href="/manager/team">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-accent hover:underline cursor-pointer gap-1"
                  >
                    View All in Team Management <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              )}
            </div>

            {isLoading ? (
              <div className="rounded-2xl border border-border bg-surface p-12 text-center space-y-3">
                <span className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin inline-block" />
                <p className="text-xs text-muted">Loading team workload data...</p>
              </div>
            ) : staffWorkload.length === 0 ? (
              /* Empty state */
              <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-surface-secondary text-muted flex items-center justify-center mx-auto">
                  <Users className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-foreground">
                    No Maintenance Staff Assigned
                  </h4>
                  <p className="text-xs text-muted max-w-sm mx-auto">
                    There are currently no maintenance staff members assigned to your department.
                    Add or assign personnel to enable workload tracking.
                  </p>
                </div>
                <Link href="/manager/team">
                  <Button variant="primary" size="sm" className="cursor-pointer gap-1.5 text-xs">
                    <Users className="h-4 w-4" /> Go to Team Management
                  </Button>
                </Link>
              </div>
            ) : (
              /* Staff Workload Cards / Table */
              <div className="space-y-4">
                {/* Workload Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="border border-border bg-surface p-4 rounded-xl shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                      Active Crew Members
                    </span>
                    <div className="text-2xl font-black text-foreground mt-1">
                      {workloadData?.totalStaff || staffWorkload.length}
                    </div>
                  </Card>

                  <Card className="border border-border bg-surface p-4 rounded-xl shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                      Total Active Workload
                    </span>
                    <div className="text-2xl font-black text-accent mt-1">
                      {staffWorkload.reduce((sum, item) => sum + item.activeWorkload, 0)}
                    </div>
                  </Card>

                  <Card className="border border-border bg-surface p-4 rounded-xl shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                      Total Resolved by Team
                    </span>
                    <div className="text-2xl font-black text-success mt-1">
                      {staffWorkload.reduce((sum, item) => sum + item.resolved, 0)}
                    </div>
                  </Card>
                </div>

                {/* Staff Roster Table */}
                <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-secondary/50 border-b border-border text-muted font-bold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Staff Member</th>
                          <th className="py-3 px-4">Contact</th>
                          <th className="py-3 px-4 text-center">Assigned</th>
                          <th className="py-3 px-4 text-center">In Progress</th>
                          <th className="py-3 px-4 text-center">Resolved</th>
                          <th className="py-3 px-4 text-center">Active Workload</th>
                          <th className="py-3 px-4 text-right">Workload Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {staffWorkload.map((item) => {
                          const { staff, assigned, inProgress, resolved, activeWorkload } = item;
                          const initials = staff.name
                            ? staff.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)
                            : "ST";

                          let workloadBadge: {
                            label: string;
                            color: "success" | "warning" | "danger" | "accent" | "default";
                          } = {
                            label: "Available",
                            color: "success",
                          };
                          if (activeWorkload > 5) {
                            workloadBadge = {
                              label: "Heavy Load",
                              color: "danger" as const,
                            };
                          } else if (activeWorkload > 2) {
                            workloadBadge = {
                              label: "Moderate Load",
                              color: "warning" as const,
                            };
                          } else if (activeWorkload > 0) {
                            workloadBadge = {
                              label: "Active",
                              color: "accent" as const,
                            };
                          }

                          return (
                            <tr
                              key={staff._id}
                              className="hover:bg-surface-secondary/40 transition-colors"
                            >
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="h-8 w-8 rounded-full bg-accent/15 text-accent flex items-center justify-center font-bold text-xs shrink-0">
                                    {initials}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-foreground text-xs">
                                      {staff.name}
                                    </div>
                                    <span className="text-[10px] text-muted">
                                      Maintenance Staff
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-4 text-muted">
                                <div className="flex items-center gap-1.5 text-[11px]">
                                  <Mail className="h-3 w-3 text-muted shrink-0" />
                                  <span className="truncate max-w-[140px]">{staff.email}</span>
                                </div>
                                {staff.phone && (
                                  <div className="flex items-center gap-1.5 text-[10px] text-muted mt-0.5">
                                    <Phone className="h-3 w-3 text-muted shrink-0" />
                                    <span>{staff.phone}</span>
                                  </div>
                                )}
                              </td>

                              <td className="py-3 px-4 text-center font-mono font-medium text-foreground">
                                {assigned}
                              </td>

                              <td className="py-3 px-4 text-center font-mono font-medium text-accent">
                                {inProgress}
                              </td>

                              <td className="py-3 px-4 text-center font-mono font-medium text-success">
                                {resolved}
                              </td>

                              <td className="py-3 px-4 text-center">
                                <span className="font-mono font-bold text-foreground text-sm">
                                  {activeWorkload}
                                </span>
                              </td>

                              <td className="py-3 px-4 text-right">
                                <Chip color={workloadBadge.color} variant="soft" size="sm">
                                  {workloadBadge.label}
                                </Chip>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* =========================================================================
          3. Issue Details Modal (Reused)
          ========================================================================= */}
      <IssueDetailsModal
        issue={selectedIssue}
        onClose={() => setSelectedIssue(null)}
      />
    </div>
  );
}
