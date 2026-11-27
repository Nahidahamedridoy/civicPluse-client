"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Chip } from "@heroui/react";
import {
  Activity,
  AlertCircle,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Filter,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
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
  AnalyticsData,
  DepartmentOption,
  DepartmentPerformanceItem,
  fetchActiveDepartments,
  fetchAdminAnalytics,
  fetchAdminDepartmentPerformance,
} from "@/lib/admin-api";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { AdminCharts } from "@/components/admin/admin-charts";

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const { user, token, role, isAuthenticated, isMounted, logout } = useAuth();

  // Mobile sidebar drawer state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Departments for filtering
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);

  // Filter states
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Data states
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [departmentPerformance, setDepartmentPerformance] = useState<
    DepartmentPerformanceItem[]
  >([]);

  // Loading & error states
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
    if (normalizedRole && normalizedRole !== "admin") {
      router.replace(getDashboardPath(role || undefined));
    }
  }, [isMounted, isAuthenticated, role, router]);

  // Load department options
  useEffect(() => {
    if (!token) return;
    fetchActiveDepartments(token)
      .then((data) => setDepartments(data))
      .catch(() => setDepartments([]));
  }, [token]);

  // Fetch analytics data
  const loadAnalytics = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const filters = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        department: departmentFilter !== "all" ? departmentFilter : undefined,
      };

      const [analyticsRes, perfRes] = await Promise.all([
        fetchAdminAnalytics(token, filters),
        fetchAdminDepartmentPerformance(token, filters),
      ]);

      setAnalyticsData(analyticsRes);
      setDepartmentPerformance(perfRes);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load municipal analytics."
      );
    } finally {
      setIsLoading(false);
    }
  }, [token, departmentFilter, startDate, endDate]);

  useEffect(() => {
    if (!isMounted || !isAuthenticated || !token) return;
    const normalizedRole = role?.toLowerCase().trim();
    if (normalizedRole !== "admin") return;

    let active = true;
    const filters = {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      department: departmentFilter !== "all" ? departmentFilter : undefined,
    };

    Promise.all([
      fetchAdminAnalytics(token, filters),
      fetchAdminDepartmentPerformance(token, filters),
    ])
      .then(([analyticsRes, perfRes]) => {
        if (!active) return;
        setAnalyticsData(analyticsRes);
        setDepartmentPerformance(perfRes);
        setErrorMessage(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Failed to load municipal analytics."
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isMounted, isAuthenticated, role, token, departmentFilter, startDate, endDate]);

  // Client-side category filtering for charts if user selects a specific category
  const filteredCategoryDistribution = useMemo(() => {
    if (!analyticsData?.issuesByCategory) return [];
    if (categoryFilter === "all") return analyticsData.issuesByCategory;
    return analyticsData.issuesByCategory.filter(
      (item) => item.category.toLowerCase() === categoryFilter.toLowerCase()
    );
  }, [analyticsData, categoryFilter]);

  // Status metrics
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      submitted: 0,
      under_review: 0,
      assigned: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0,
    };

    analyticsData?.issuesByStatus?.forEach((s) => {
      if (counts[s.status] !== undefined) {
        counts[s.status] = s.count;
      }
    });

    return counts;
  }, [analyticsData]);

  const totalIssues = analyticsData?.summary?.totalIssues ?? 0;
  const pendingIssues = statusCounts.submitted + statusCounts.under_review;
  const resolvedIssues = statusCounts.resolved + statusCounts.closed;
  const activeTasks = statusCounts.assigned + statusCounts.in_progress;
  const avgResolutionHours = analyticsData?.summary?.averageResolutionHours ?? 0;
  const resolutionRatePct = analyticsData?.summary?.resolutionRatePercentage ?? 0;

  // Available categories list
  const categoryOptions = useMemo(() => {
    if (!analyticsData?.issuesByCategory) return [];
    return analyticsData.issuesByCategory.map((c) => c.category);
  }, [analyticsData]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row transition-colors">
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

      {/* Sidebar Navigation */}
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
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-secondary/70 transition-all cursor-pointer"
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
            </Link>

            <Link
              href="/admin/users"
              onClick={() => setMobileSidebarOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-secondary/70 transition-all cursor-pointer group"
            >
              <Users className="h-4 w-4 shrink-0 group-hover:text-accent transition-colors" />
              <span>User Management</span>
            </Link>

            <Link
              href="/admin/analytics"
              onClick={() => setMobileSidebarOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold bg-accent text-accent-foreground shadow-xs transition-all cursor-pointer"
            >
              <LineChart className="h-4 w-4 shrink-0" />
              <span>Analytics & Reports</span>
            </Link>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border space-y-3 bg-surface-secondary/20">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-bold text-xs shrink-0">
              {isMounted ? user?.name?.charAt(0).toUpperCase() || "A" : "A"}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-foreground truncate">
                {isMounted ? user?.name ?? "" : ""}
              </span>
              <span className="text-[10px] text-muted truncate">
                {isMounted ? user?.email ?? "" : ""}
              </span>
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

      {/* Main Content Area */}
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
                  Citywide Analytics & Performance Intelligence
                </h1>
                <Chip color="accent" variant="soft" size="sm" className="hidden sm:inline-flex text-[10px]">
                  Real-time SLA & Trends
                </Chip>
              </div>
              <p className="text-[10px] text-muted hidden sm:block">
                Municipal operations data, monthly volume telemetry, and resolution rates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              isIconOnly
              size="sm"
              onPress={loadAnalytics}
              isDisabled={isLoading}
              aria-label="Refresh analytics data"
              className="cursor-pointer text-muted hover:text-foreground"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>

            <ThemeToggle />

            <div className="h-4 w-px bg-border mx-1 hidden sm:block" />

            <Chip color="success" variant="soft" size="sm" className="hidden sm:inline-flex">
              <ShieldCheck className="h-3 w-3 mr-1 inline" /> Administrator
            </Chip>
          </div>
        </header>

        {/* Workspace Body */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1">
          {/* Error Alert */}
          {errorMessage && (
            <Alert className="border border-danger/40 bg-danger/10 text-danger rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onPress={loadAnalytics}
                className="cursor-pointer text-xs shrink-0"
              >
                Retry
              </Button>
            </Alert>
          )}

          {/* Filter Bar: Date Range, Department, Category */}
          <div className="p-4 rounded-2xl border border-border bg-surface shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-accent" /> Analytics Filters
              </span>

              {(departmentFilter !== "all" ||
                categoryFilter !== "all" ||
                startDate ||
                endDate) && (
                <button
                  onClick={() => {
                    setDepartmentFilter("all");
                    setCategoryFilter("all");
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="text-xs text-accent hover:underline font-medium cursor-pointer"
                >
                  Reset All Filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Department Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted flex items-center gap-1">
                  <Building className="h-3 w-3" /> Department
                </label>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface-secondary/30 text-foreground text-xs focus:outline-hidden focus:border-accent"
                >
                  <option value="all">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted flex items-center gap-1">
                  <FileSpreadsheet className="h-3 w-3" /> Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface-secondary/30 text-foreground text-xs focus:outline-hidden focus:border-accent"
                >
                  <option value="all">All Categories</option>
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface-secondary/30 text-foreground text-xs focus:outline-hidden focus:border-accent"
                />
              </div>

              {/* End Date */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface-secondary/30 text-foreground text-xs focus:outline-hidden focus:border-accent"
                />
              </div>
            </div>
          </div>

          {/* Feature 1: Core KPI Metrics (5 Summary Cards) */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
              Operational Performance Indicators
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {/* 1. Total Issues */}
              <Card className="border border-border bg-surface p-4 rounded-2xl shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    Total Issues
                  </span>
                  <div className="p-2 rounded-xl bg-surface-secondary text-accent">
                    <FileText className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-foreground">
                    {isLoading ? "--" : totalIssues}
                  </div>
                  <span className="text-[10px] text-muted">Reported incidents</span>
                </div>
              </Card>

              {/* 2. Pending Issues */}
              <Card className="border border-border bg-surface p-4 rounded-2xl shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-warning">
                    Pending Issues
                  </span>
                  <div className="p-2 rounded-xl bg-warning/15 text-warning">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-foreground">
                    {isLoading ? "--" : pendingIssues}
                  </div>
                  <span className="text-[10px] text-muted">Awaiting resolution</span>
                </div>
              </Card>

              {/* 3. Resolved Issues */}
              <Card className="border border-border bg-surface p-4 rounded-2xl shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-success">
                    Resolved Issues
                  </span>
                  <div className="p-2 rounded-xl bg-success/15 text-success">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-foreground">
                    {isLoading ? "--" : resolvedIssues}
                  </div>
                  <span className="text-[10px] text-muted">
                    {resolutionRatePct > 0 ? `${resolutionRatePct}% rate` : "Repairs verified"}
                  </span>
                </div>
              </Card>

              {/* 4. Active Maintenance Tasks */}
              <Card className="border border-border bg-surface p-4 rounded-2xl shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                    Active Tasks
                  </span>
                  <div className="p-2 rounded-xl bg-accent/15 text-accent">
                    <Wrench className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-foreground">
                    {isLoading ? "--" : activeTasks}
                  </div>
                  <span className="text-[10px] text-muted">Field crews dispatched</span>
                </div>
              </Card>

              {/* 5. Average Resolution Time */}
              <Card className="border border-border bg-surface p-4 rounded-2xl shadow-xs space-y-2 col-span-2 sm:col-span-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    Avg Resolution
                  </span>
                  <div className="p-2 rounded-xl bg-surface-secondary text-muted">
                    <Timer className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-foreground">
                    {isLoading ? "--" : `${avgResolutionHours} hrs`}
                  </div>
                  <span className="text-[10px] text-muted">Average repair duration</span>
                </div>
              </Card>
            </div>
          </div>

          {/* Feature 2 & 3: Monthly Trends & Category Distribution Charts (Recharts) */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
              Incident Volumes & Categorical Distribution
            </h3>
            <AdminCharts
              monthlyTrends={analyticsData?.monthlyTrends || []}
              categoryDistribution={filteredCategoryDistribution}
              isLoading={isLoading}
            />
          </div>

          {/* Feature 4: Department-Wise Performance and Resolution Rates */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-accent" /> Department Performance Ledger
                </h3>
                <p className="text-xs text-muted">
                  Municipal division resolution velocity, pending backlog, and SLA efficiency
                </p>
              </div>

              <span className="text-xs text-muted font-mono">
                {departmentPerformance.length} Divisions Ranked
              </span>
            </div>

            {isLoading ? (
              <div className="rounded-2xl border border-border bg-surface p-12 text-center space-y-3">
                <span className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin inline-block" />
                <p className="text-xs text-muted">Analyzing department performance metrics...</p>
              </div>
            ) : departmentPerformance.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center space-y-3">
                <Building className="h-8 w-8 text-muted mx-auto" />
                <h4 className="text-sm font-bold text-foreground">No Performance Records</h4>
                <p className="text-xs text-muted max-w-sm mx-auto">
                  No department telemetry is available for the selected filters.
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
                        <th className="py-3.5 px-4 text-center">Pending Backlog</th>
                        <th className="py-3.5 px-4 text-center">In Progress</th>
                        <th className="py-3.5 px-4 text-center">Resolved</th>
                        <th className="py-3.5 px-4 text-center">Resolution Rate</th>
                        <th className="py-3.5 px-4 text-right">Avg Duration</th>
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
                          <tr
                            key={dept.departmentId}
                            className="hover:bg-surface-secondary/40 transition-colors"
                          >
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
        </main>
      </div>
    </div>
  );
}
