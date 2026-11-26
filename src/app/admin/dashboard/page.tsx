"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Chip } from "@heroui/react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Building,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Percent,
  RefreshCw,
  ShieldCheck,
  Timer,
  Trophy,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { getDashboardPath } from "@/lib/auth";
import {
  AdminDashboardData,
  AnalyticsData,
  CitizenIssue,
  DepartmentPerformanceItem,
  fetchAdminAnalytics,
  fetchAdminDashboard,
  fetchAdminDepartmentPerformance,
  fetchRecentIssuesAllDepartments,
  getPriorityMeta,
  getStatusMeta,
} from "@/lib/admin-api";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { AdminCharts } from "@/components/admin/admin-charts";
import { IssueDetailsModal } from "@/components/citizen/issue-details-modal";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, token, role, isAuthenticated, isMounted, logout } = useAuth();

  // Mobile sidebar drawer state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Data states
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [departmentPerformance, setDepartmentPerformance] = useState<DepartmentPerformanceItem[]>([]);
  const [recentIssues, setRecentIssues] = useState<CitizenIssue[]>([]);

  // Loading & error states
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal state
  const [selectedIssue, setSelectedIssue] = useState<CitizenIssue | null>(null);

  // Route protection: Admins only
  useEffect(() => {
    if (!isMounted) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    const normalizedRole = role?.toLowerCase().trim();
    if (normalizedRole && normalizedRole !== "admin") {
      router.replace(getDashboardPath(role || undefined));
    }
  }, [isMounted, isAuthenticated, role, router]);

  // Load all admin dashboard data concurrently from real backend endpoints
  const loadAdminData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [dashRes, analyticsRes, deptPerfRes, recentRes] = await Promise.all([
        fetchAdminDashboard(token),
        fetchAdminAnalytics(token),
        fetchAdminDepartmentPerformance(token),
        fetchRecentIssuesAllDepartments(token, 8),
      ]);

      setDashboardData(dashRes);
      setAnalyticsData(analyticsRes);
      setDepartmentPerformance(deptPerfRes);
      setRecentIssues(
        recentRes.length > 0 ? recentRes : dashRes.recentIssues || []
      );
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load system-wide administration statistics."
      );
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isMounted || !isAuthenticated || !token) return;

    const normalizedRole = role?.toLowerCase().trim();
    if (normalizedRole !== "admin") return;

    let active = true;
    Promise.all([
      fetchAdminDashboard(token),
      fetchAdminAnalytics(token),
      fetchAdminDepartmentPerformance(token),
      fetchRecentIssuesAllDepartments(token, 8),
    ])
      .then(([dashRes, analyticsRes, deptPerfRes, recentRes]) => {
        if (!active) return;
        setDashboardData(dashRes);
        setAnalyticsData(analyticsRes);
        setDepartmentPerformance(deptPerfRes);
        setRecentIssues(
          recentRes.length > 0 ? recentRes : dashRes.recentIssues || []
        );
        setErrorMessage(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Failed to load system-wide administration statistics."
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isMounted, isAuthenticated, role, token]);

  // System-wide KPI calculation
  const statusCounts = dashboardData?.issuesByStatus || {
    submitted: 0,
    under_review: 0,
    assigned: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
  };

  const totalIssuesCount =
    dashboardData?.summary?.totalIssues ??
    analyticsData?.summary?.totalIssues ??
    0;

  const pendingIssuesCount =
    statusCounts.submitted + statusCounts.under_review;

  const resolvedIssuesCount =
    statusCounts.resolved + statusCounts.closed;

  const activeMaintenanceTasksCount =
    statusCounts.assigned + statusCounts.in_progress;

  const totalUsersCount = dashboardData?.summary?.totalUsers ?? 0;
  const totalDepartmentsCount = dashboardData?.summary?.totalDepartments ?? 0;
  const resolutionRatePct = analyticsData?.summary?.resolutionRatePercentage ?? 0;
  const avgResolutionHours = analyticsData?.summary?.averageResolutionHours ?? 0;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row transition-colors">
      {/* =========================================================================
          1. Sidebar Navigation (Desktop & Mobile Drawer)
          ========================================================================= */}
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
                  Admin Central
                </span>
              </div>
            </Link>

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

          {/* Navigation Links */}
          <nav className="space-y-1">
            <Link
              href="/admin/dashboard"
              onClick={() => setMobileSidebarOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold bg-accent text-accent-foreground shadow-xs transition-all cursor-pointer"
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              <span>Dashboard Overview</span>
            </Link>

            <Link
              href="/admin/issues"
              onClick={() => setMobileSidebarOpen(false)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-secondary/70 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-4 w-4 shrink-0 group-hover:text-accent transition-colors" />
                <span>Issue Management</span>
              </div>
              {totalIssuesCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-surface-secondary text-muted group-hover:bg-accent/20 group-hover:text-accent transition-colors">
                  {totalIssuesCount}
                </span>
              )}
            </Link>

            <Link
              href="/admin/departments"
              onClick={() => setMobileSidebarOpen(false)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-secondary/70 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <Building className="h-4 w-4 shrink-0 group-hover:text-accent transition-colors" />
                <span>Department Management</span>
              </div>
              {totalDepartmentsCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-surface-secondary text-muted group-hover:bg-accent/20 group-hover:text-accent transition-colors">
                  {totalDepartmentsCount}
                </span>
              )}
            </Link>

            <Link
              href="/admin/users"
              onClick={() => setMobileSidebarOpen(false)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-secondary/70 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 shrink-0 group-hover:text-accent transition-colors" />
                <span>User Management</span>
              </div>
              {totalUsersCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-surface-secondary text-muted group-hover:bg-accent/20 group-hover:text-accent transition-colors">
                  {totalUsersCount}
                </span>
              )}
            </Link>

            <Link
              href="/admin/analytics"
              onClick={() => setMobileSidebarOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-secondary/70 transition-all cursor-pointer group"
            >
              <LineChart className="h-4 w-4 shrink-0 group-hover:text-accent transition-colors" />
              <span>Analytics & Reports</span>
            </Link>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border space-y-3 bg-surface-secondary/20">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-bold text-xs shrink-0">
              {user?.name?.charAt(0).toUpperCase() || "A"}
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
              <ExternalLink className="h-3 w-3" /> Public Portal
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
                  Citywide Administration Dashboard
                </h1>
                <Chip color="accent" variant="soft" size="sm" className="hidden sm:inline-flex text-[10px]">
                  System Admin
                </Chip>
              </div>
              <p className="text-[10px] text-muted hidden sm:block">
                Municipal Operations • All Departments Oversight & Live Analytics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              isIconOnly
              size="sm"
              onPress={loadAdminData}
              isDisabled={isLoading}
              aria-label="Refresh dashboard data"
              className="cursor-pointer text-muted hover:text-foreground"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>

            <ThemeToggle />

            <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />

            <Chip color="success" variant="soft" size="sm" className="hidden sm:inline-flex">
              <ShieldCheck className="h-3 w-3 mr-1 inline" /> Administrator
            </Chip>
          </div>
        </header>

        {/* Dashboard Workspace */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-8 flex-1">
          {/* Error Alert with Retry */}
          {errorMessage && (
            <Alert className="border border-danger/40 bg-danger/10 text-danger rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 sm:mt-0" />
                <div className="text-xs">
                  <span className="font-bold block">Unable to load admin dashboard data</span>
                  <span>{errorMessage}</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onPress={loadAdminData}
                className="cursor-pointer text-xs shrink-0"
              >
                Retry
              </Button>
            </Alert>
          )}

          {/* Welcome & System Summary Banner */}
          <div className="rounded-2xl border border-border bg-gradient-to-r from-surface via-surface to-accent/5 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Chip color="accent" variant="soft" size="sm">
                  Executive Console
                </Chip>
                <span className="text-xs text-muted">Full Municipal Access</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Welcome back, {user?.name || "Administrator"}!
              </h2>
              <p className="text-sm text-muted max-w-xl leading-relaxed">
                Monitor cross-department operations, track real-time resolution metrics, and ensure
                accountability across all city sectors.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link href="/admin/issues">
                <Button
                  variant="primary"
                  size="md"
                  className="gap-2 font-semibold shadow-xs cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  All Issues ({totalIssuesCount})
                </Button>
              </Link>

              <Link href="/admin/departments">
                <Button
                  variant="outline"
                  size="md"
                  className="gap-2 cursor-pointer font-medium"
                >
                  <Building className="h-4 w-4 text-accent" />
                  Departments ({totalDepartmentsCount})
                </Button>
              </Link>
            </div>
          </div>

          {/* =====================================================================
              Feature 1: System-Wide Statistics (4 Core KPI Cards)
              ===================================================================== */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                System-Wide Incident Statistics
              </h3>
              {isLoading && (
                <span className="text-xs text-muted flex items-center gap-1.5">
                  <RefreshCw className="h-3 w-3 animate-spin" /> Updating metrics...
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
                    {isLoading ? "--" : totalIssuesCount}
                  </div>
                  <span className="text-xs text-muted">All-time municipal reports</span>
                </div>
              </Card>

              {/* 2. Pending Issues */}
              <Card className="border border-border bg-surface p-5 rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-warning">
                    Pending Issues
                  </span>
                  <div className="rounded-xl bg-warning/15 p-2 text-warning">
                    <Clock className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-black text-foreground">
                    {isLoading ? "--" : pendingIssuesCount}
                  </div>
                  <span className="text-xs text-muted">Submitted or under review</span>
                </div>
              </Card>

              {/* 3. Resolved Issues */}
              <Card className="border border-border bg-surface p-5 rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-success">
                    Resolved Issues
                  </span>
                  <div className="rounded-xl bg-success/15 p-2 text-success">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-black text-foreground">
                    {isLoading ? "--" : resolvedIssuesCount}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <span>Repairs verified</span>
                    {resolutionRatePct > 0 && (
                      <span className="text-success font-semibold">({resolutionRatePct}%)</span>
                    )}
                  </div>
                </div>
              </Card>

              {/* 4. Active Maintenance Tasks */}
              <Card className="border border-border bg-surface p-5 rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-accent">
                    Active Tasks
                  </span>
                  <div className="rounded-xl bg-accent/15 p-2 text-accent">
                    <Wrench className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-black text-foreground">
                    {isLoading ? "--" : activeMaintenanceTasksCount}
                  </div>
                  <span className="text-xs text-muted">Assigned & actively repaired</span>
                </div>
              </Card>
            </div>
          </div>

          {/* Secondary Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-muted block">System Users</span>
                <span className="text-base font-black text-foreground">{isLoading ? "--" : totalUsersCount}</span>
              </div>
              <Users className="h-4 w-4 text-muted" />
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-muted block">Departments</span>
                <span className="text-base font-black text-foreground">{isLoading ? "--" : totalDepartmentsCount}</span>
              </div>
              <Building className="h-4 w-4 text-muted" />
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-muted block">Avg Resolution</span>
                <span className="text-base font-black text-foreground">
                  {isLoading ? "--" : `${avgResolutionHours} hrs`}
                </span>
              </div>
              <Timer className="h-4 w-4 text-muted" />
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-muted block">Resolution Rate</span>
                <span className="text-base font-black text-success">
                  {isLoading ? "--" : `${resolutionRatePct}%`}
                </span>
              </div>
              <Percent className="h-4 w-4 text-success" />
            </div>
          </div>

          {/* =====================================================================
              Feature 5: Quick Links to Admin Management Modules
              ===================================================================== */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
              Administration Modules & Quick Shortcuts
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/admin/issues" className="block group">
                <Card className="border border-border bg-surface hover:border-accent/50 p-5 rounded-2xl shadow-xs transition-all group-hover:shadow-md h-full space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground group-hover:text-accent transition-colors">
                      Issue Management
                    </h4>
                    <p className="text-xs text-muted mt-0.5">
                      Oversee, triage, and filter issues across all city departments
                    </p>
                  </div>
                </Card>
              </Link>

              <Link href="/admin/departments" className="block group">
                <Card className="border border-border bg-surface hover:border-accent/50 p-5 rounded-2xl shadow-xs transition-all group-hover:shadow-md h-full space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-surface-secondary text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                      <Building className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground group-hover:text-accent transition-colors">
                      Department Management
                    </h4>
                    <p className="text-xs text-muted mt-0.5">
                      Configure active municipal divisions, codes, and managers
                    </p>
                  </div>
                </Card>
              </Link>

              <Link href="/admin/users" className="block group">
                <Card className="border border-border bg-surface hover:border-accent/50 p-5 rounded-2xl shadow-xs transition-all group-hover:shadow-md h-full space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-surface-secondary text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                      <Users className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground group-hover:text-accent transition-colors">
                      User Management
                    </h4>
                    <p className="text-xs text-muted mt-0.5">
                      Manage citizen accounts, staff roles, and access credentials
                    </p>
                  </div>
                </Card>
              </Link>

              <Link href="/admin/analytics" className="block group">
                <Card className="border border-border bg-surface hover:border-accent/50 p-5 rounded-2xl shadow-xs transition-all group-hover:shadow-md h-full space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-surface-secondary text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                      <LineChart className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground group-hover:text-accent transition-colors">
                      Analytics & Reports
                    </h4>
                    <p className="text-xs text-muted mt-0.5">
                      Inspect deep performance metrics, resolution SLAs, and trends
                    </p>
                  </div>
                </Card>
              </Link>
            </div>
          </div>

          {/* =====================================================================
              Feature 4: Monthly Issue Trends & Category Distribution (Recharts)
              ===================================================================== */}
          <AdminCharts
            monthlyTrends={analyticsData?.monthlyTrends || []}
            categoryDistribution={analyticsData?.issuesByCategory || []}
            isLoading={isLoading}
          />

          {/* =====================================================================
              Feature 2: Department-Wise Issue Statistics and Performance
              ===================================================================== */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-accent" /> Department Performance Ledger
                </h3>
                <p className="text-xs text-muted">
                  Cross-department comparative rankings, workload distribution, and resolution velocity
                </p>
              </div>

              <Link href="/admin/departments">
                <Button variant="ghost" size="sm" className="text-xs text-accent hover:underline cursor-pointer gap-1">
                  Manage Departments <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>

            {isLoading ? (
              <div className="rounded-2xl border border-border bg-surface p-12 text-center space-y-3">
                <span className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin inline-block" />
                <p className="text-xs text-muted">Calculating department rankings...</p>
              </div>
            ) : departmentPerformance.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center space-y-3">
                <Building className="h-8 w-8 text-muted mx-auto" />
                <h4 className="text-sm font-bold text-foreground">No Department Statistics Available</h4>
                <p className="text-xs text-muted max-w-sm mx-auto">
                  Departments will appear here once incident reports are filed and assigned.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-secondary/50 border-b border-border text-muted font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4 text-center">Rank</th>
                        <th className="py-3.5 px-4">Department</th>
                        <th className="py-3.5 px-4 text-center">Total Issues</th>
                        <th className="py-3.5 px-4 text-center">Pending</th>
                        <th className="py-3.5 px-4 text-center">In Progress</th>
                        <th className="py-3.5 px-4 text-center">Resolved</th>
                        <th className="py-3.5 px-4 text-center">Resolution Rate</th>
                        <th className="py-3.5 px-4 text-right">Avg Speed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {departmentPerformance.map((dept) => {
                        const rate = dept.resolutionRatePercentage || 0;
                        let rateColor: "success" | "warning" | "danger" | "default" = "default";
                        if (rate >= 75) rateColor = "success";
                        else if (rate >= 40) rateColor = "warning";
                        else if (rate > 0) rateColor = "danger";

                        return (
                          <tr key={dept.departmentId} className="hover:bg-surface-secondary/40 transition-colors">
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`inline-flex items-center justify-center h-6 w-6 rounded-full font-bold text-[11px] font-mono ${
                                  dept.rank === 1
                                    ? "bg-accent/20 text-accent ring-1 ring-accent/30"
                                    : "bg-surface-secondary text-muted"
                                }`}
                              >
                                #{dept.rank}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-foreground text-xs">
                                {dept.departmentName}
                              </div>
                              <span className="font-mono text-[10px] text-muted uppercase">
                                {dept.departmentCode}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-center font-mono font-medium text-foreground">
                              {dept.totalIssues}
                            </td>

                            <td className="py-3.5 px-4 text-center font-mono font-medium text-warning">
                              {dept.pendingIssues}
                            </td>

                            <td className="py-3.5 px-4 text-center font-mono font-medium text-accent">
                              {dept.inProgressIssues}
                            </td>

                            <td className="py-3.5 px-4 text-center font-mono font-medium text-success">
                              {dept.resolvedIssues}
                            </td>

                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <div className="w-16 h-1.5 rounded-full bg-surface-secondary overflow-hidden hidden sm:block">
                                  <div
                                    className={`h-full ${
                                      rate >= 75
                                        ? "bg-success"
                                        : rate >= 40
                                        ? "bg-warning"
                                        : "bg-danger"
                                    }`}
                                    style={{ width: `${Math.min(100, rate)}%` }}
                                  />
                                </div>
                                <Chip color={rateColor} variant="soft" size="sm">
                                  {rate}%
                                </Chip>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-right font-mono text-muted whitespace-nowrap">
                              {dept.averageResolutionHours > 0
                                ? `${dept.averageResolutionHours} hrs`
                                : "N/A"}
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
              Feature 3: Recent Issues from All Departments
              ===================================================================== */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Recent Incidents (All Departments)
                </h3>
                <p className="text-xs text-muted">
                  Latest infrastructure reports logged across the entire municipal network
                </p>
              </div>

              {recentIssues.length > 0 && (
                <Link href="/admin/issues">
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

            {isLoading ? (
              <div className="rounded-2xl border border-border bg-surface p-12 text-center space-y-3">
                <span className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin inline-block" />
                <p className="text-xs text-muted">Loading citywide issues...</p>
              </div>
            ) : recentIssues.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-surface-secondary text-muted flex items-center justify-center mx-auto">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-foreground">
                    No Incident Reports Found
                  </h4>
                  <p className="text-xs text-muted max-w-sm mx-auto">
                    There are currently no active or historical issues reported in the municipal system.
                  </p>
                </div>
                <Link href="/admin/issues">
                  <Button variant="outline" size="sm" className="cursor-pointer gap-1.5 text-xs">
                    <FileText className="h-4 w-4" /> Go to Issue Management
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-secondary/50 border-b border-border text-muted font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4">Title & ID</th>
                        <th className="py-3.5 px-4">Department</th>
                        <th className="py-3.5 px-4">Category</th>
                        <th className="py-3.5 px-4">Priority</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Reported Date</th>
                        <th className="py-3.5 px-4 text-right">Action</th>
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
                            <td className="py-3.5 px-4 max-w-[220px]">
                              <div className="font-semibold text-foreground text-xs line-clamp-1">
                                {item.title}
                              </div>
                              <span className="font-mono text-[10px] text-muted">
                                #{item._id.slice(-6).toUpperCase()}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="font-medium text-foreground">
                                {item.department?.name || "Unassigned"}
                              </span>
                              {item.department?.code && (
                                <span className="text-[10px] font-mono text-muted ml-1">
                                  ({item.department.code})
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-muted font-medium whitespace-nowrap">
                              {item.category}
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <Chip color={priorityMeta.color} variant="secondary" size="sm">
                                {priorityMeta.label}
                              </Chip>
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <Chip color={statusMeta.color} variant="soft" size="sm">
                                {statusMeta.label}
                              </Chip>
                            </td>

                            <td className="py-3.5 px-4 text-muted whitespace-nowrap">
                              {formattedDate}
                            </td>

                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
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
        </main>
      </div>

      {/* Reusable Issue Details Modal */}
      <IssueDetailsModal
        issue={selectedIssue}
        onClose={() => setSelectedIssue(null)}
      />
    </div>
  );
}
