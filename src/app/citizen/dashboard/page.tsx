"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Chip, Alert } from "@heroui/react";
import {
  Activity,
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  FileText,
  FileSpreadsheet,
  Filter,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
  Wrench,
  X,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { getDashboardPath } from "@/lib/auth";
import {
  CitizenDashboardData,
  CitizenIssue,
  fetchCitizenDashboard,
  fetchMyReports,
  fetchUnreadNotificationCount,
  getStatusMeta,
  getPriorityMeta,
} from "@/lib/citizen-api";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { IssueDetailsModal } from "@/components/citizen/issue-details-modal";

type NavTab = "overview" | "reports" | "profile";

export default function CitizenDashboardPage() {
  const router = useRouter();
  const { user, token, role, isAuthenticated, isMounted, logout } = useAuth();

  // Navigation & Mobile drawer
  const [activeTab, setActiveTab] = useState<NavTab>("overview");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Modals state
  const [selectedIssue, setSelectedIssue] = useState<CitizenIssue | null>(null);

  // Data & loading states
  const [dashboardData, setDashboardData] = useState<CitizenDashboardData | null>(null);
  const [reportsList, setReportsList] = useState<CitizenIssue[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters for "My Reports" view
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Route protection
  useEffect(() => {
    if (!isMounted) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (role && role !== "citizen") {
      router.replace(getDashboardPath(role));
    }
  }, [isMounted, isAuthenticated, role, router]);

  // Manual refresh callback
  const handleRefresh = async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [dashRes, unreadRes] = await Promise.all([
        fetchCitizenDashboard(token),
        fetchUnreadNotificationCount(token),
      ]);
      setDashboardData(dashRes);
      setReportsList(dashRes.recentReports || []);
      setUnreadCount(unreadRes);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An unexpected error occurred while loading dashboard data.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load dashboard data from actual backend APIs on mount
  useEffect(() => {
    if (!isMounted || !isAuthenticated || role !== "citizen" || !token) return;

    const authToken = token;
    let isSubscribed = true;

    async function loadInitialData() {
      try {
        const [dashRes, unreadRes] = await Promise.all([
          fetchCitizenDashboard(authToken),
          fetchUnreadNotificationCount(authToken),
        ]);

        if (isSubscribed) {
          setDashboardData(dashRes);
          setReportsList(dashRes.recentReports || []);
          setUnreadCount(unreadRes);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (isSubscribed) {
          setIsLoading(false);
          if (err instanceof Error) {
            setErrorMessage(err.message);
          } else {
            setErrorMessage("An unexpected error occurred while loading dashboard data.");
          }
        }
      }
    }

    loadInitialData();

    return () => {
      isSubscribed = false;
    };
  }, [isMounted, isAuthenticated, role, token]);

  // Fetch full reports list when user switches to "reports" tab or changes filters
  const loadFullReports = useCallback(
    async (status?: string, search?: string) => {
      if (!token) return;
      setIsLoading(true);
      try {
        const filters: { status?: string; search?: string } = {};
        if (status && status !== "all") filters.status = status;
        if (search?.trim()) filters.search = search.trim();

        const res = await fetchMyReports(token, filters);
        setReportsList(res.issues);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setErrorMessage(err.message);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [token]
  );

  const handleStatusFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    loadFullReports(newStatus, searchQuery);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadFullReports(statusFilter, searchQuery);
  };

  // If verifying authentication, display loading skeleton
  if (!isMounted || !isAuthenticated || role !== "citizen") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="space-y-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 text-accent mx-auto animate-pulse">
            <Activity className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-muted">
            Verifying citizen credentials...
          </p>
        </div>
      </div>
    );
  }

  const summary = dashboardData?.summary || {
    totalReportedIssues: 0,
    pendingIssues: 0,
    inProgressIssues: 0,
    resolvedIssues: 0,
  };

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
                  Citizen Portal
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

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => {
                setActiveTab("overview");
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "overview"
                  ? "bg-accent text-accent-foreground shadow-xs"
                  : "text-muted hover:text-foreground hover:bg-surface-secondary/70"
              }`}
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("reports");
                setMobileSidebarOpen(false);
                loadFullReports(statusFilter);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "reports"
                  ? "bg-accent text-accent-foreground shadow-xs"
                  : "text-muted hover:text-foreground hover:bg-surface-secondary/70"
              }`}
            >
              <FileSpreadsheet className="h-4 w-4 shrink-0" />
              <span>My Reports</span>
              {summary.totalReportedIssues > 0 && (
                <span
                  className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    activeTab === "reports"
                      ? "bg-white/20 text-white"
                      : "bg-surface-secondary text-muted"
                  }`}
                >
                  {summary.totalReportedIssues}
                </span>
              )}
            </button>

            <Link
              href="/citizen/report-issue"
              onClick={() => setMobileSidebarOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-accent hover:bg-accent/10 transition-colors cursor-pointer"
            >
              <PlusCircle className="h-4 w-4 shrink-0" />
              <span>Report an Issue</span>
            </Link>

            <button
              onClick={() => {
                setActiveTab("profile");
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "profile"
                  ? "bg-accent text-accent-foreground shadow-xs"
                  : "text-muted hover:text-foreground hover:bg-surface-secondary/70"
              }`}
            >
              <User className="h-4 w-4 shrink-0" />
              <span>Profile Settings</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border space-y-3 bg-surface-secondary/20">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-bold text-xs">
              {user?.name?.charAt(0).toUpperCase() || "C"}
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
              <h1 className="text-sm font-bold text-foreground">
                Citizen Operations Dashboard
              </h1>
              <p className="text-[10px] text-muted hidden sm:block">
                Municipal Services • Live Transparency Feed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Refresh action */}
            <Button
              variant="ghost"
              isIconOnly
              size="sm"
              onPress={handleRefresh}
              isDisabled={isLoading}
              aria-label="Refresh dashboard data"
              className="cursor-pointer text-muted hover:text-foreground"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>

            {/* Notification Icon */}
            <div className="relative">
              <Button
                variant="ghost"
                isIconOnly
                size="sm"
                aria-label="Notifications"
                className="cursor-pointer text-muted hover:text-foreground"
              >
                <Bell className="h-4 w-4" />
              </Button>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
                </span>
              )}
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />

            <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />

            {/* User chip */}
            <Chip color="success" variant="soft" size="sm" className="hidden sm:inline-flex">
              <ShieldCheck className="h-3 w-3 mr-1 inline" /> Citizen
            </Chip>
          </div>
        </header>

        {/* Dashboard Body Content */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-8 flex-1">
          {/* Error Banner with Retry */}
          {errorMessage && (
            <Alert className="border border-danger/40 bg-danger/10 text-danger rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold block">Backend Connectivity Error</span>
                  <span>{errorMessage}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" onPress={handleRefresh} className="cursor-pointer text-xs">
                Retry
              </Button>
            </Alert>
          )}

          {/* =====================================================================
              TAB: OVERVIEW
              ===================================================================== */}
          {activeTab === "overview" && (
            <div className="space-y-8 animate-in fade-in">
              {/* Welcome Banner */}
              <div className="rounded-2xl border border-border bg-gradient-to-r from-surface via-surface to-accent/5 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Chip color="accent" variant="soft" size="sm">
                      Citizen Hub
                    </Chip>
                    <span className="text-xs text-muted">Sector Verified</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    Welcome back, {user?.name}!
                  </h2>
                  <p className="text-sm text-muted max-w-xl leading-relaxed">
                    Track the real-time resolution status of infrastructure reports you submitted,
                    or alert municipal teams to newly observed hazards.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="primary"
                    size="md"
                    onPress={() => router.push("/citizen/report-issue")}
                    className="gap-2 font-semibold shadow-xs cursor-pointer"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Report New Issue
                  </Button>

                  <Button
                    variant="outline"
                    size="md"
                    onPress={() => {
                      setActiveTab("reports");
                      loadFullReports();
                    }}
                    className="gap-2 cursor-pointer font-medium"
                  >
                    <FileText className="h-4 w-4 text-accent" />
                    View All Reports
                  </Button>
                </div>
              </div>

              {/* 4 Summary Cards (Requirement 3: Actual backend data) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* Total Reports */}
                <Card className="border border-border bg-surface p-5 rounded-2xl shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">
                      Total Reports
                    </span>
                    <div className="rounded-xl bg-surface-secondary p-2 text-accent">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-black text-foreground">
                      {summary.totalReportedIssues}
                    </div>
                    <span className="text-xs text-muted">All-time submissions</span>
                  </div>
                </Card>

                {/* Pending Reports */}
                <Card className="border border-border bg-surface p-5 rounded-2xl shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-warning">
                      Pending Review
                    </span>
                    <div className="rounded-xl bg-warning/15 p-2 text-warning">
                      <Clock className="h-5 w-5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-black text-foreground">
                      {summary.pendingIssues}
                    </div>
                    <span className="text-xs text-muted">Awaiting intake verification</span>
                  </div>
                </Card>

                {/* In Progress */}
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
                      {summary.inProgressIssues}
                    </div>
                    <span className="text-xs text-muted">Maintenance dispatched</span>
                  </div>
                </Card>

                {/* Resolved Reports */}
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
                      {summary.resolvedIssues}
                    </div>
                    <span className="text-xs text-muted">Repairs completed</span>
                  </div>
                </Card>
              </div>

              {/* Quick Actions (Requirement 5) */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card
                    onClick={() => router.push("/citizen/report-issue")}
                    className="border border-border bg-surface hover:border-accent/50 p-5 rounded-2xl shadow-xs cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                        <PlusCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground group-hover:text-accent transition-colors">
                          Report New Issue
                        </h4>
                        <p className="text-xs text-muted">Log potholes, streetlights, drainage</p>
                      </div>
                    </div>
                  </Card>

                  <Card
                    onClick={() => {
                      setActiveTab("reports");
                      loadFullReports("all");
                    }}
                    className="border border-border bg-surface hover:border-accent/50 p-5 rounded-2xl shadow-xs cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-surface-secondary text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground group-hover:text-accent transition-colors">
                          View My Reports
                        </h4>
                        <p className="text-xs text-muted">See full history and status filters</p>
                      </div>
                    </div>
                  </Card>

                  <Card
                    onClick={() => {
                      setActiveTab("reports");
                      loadFullReports("in_progress");
                      setStatusFilter("in_progress");
                    }}
                    className="border border-border bg-surface hover:border-accent/50 p-5 rounded-2xl shadow-xs cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-warning/10 text-warning group-hover:bg-warning group-hover:text-white transition-colors">
                        <Wrench className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground group-hover:text-accent transition-colors">
                          Track Active Repairs
                        </h4>
                        <p className="text-xs text-muted">Inspect assigned municipal crews</p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              {/* Recent Reports Section (Requirement 4) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      Recent Incident Reports
                    </h3>
                    <p className="text-xs text-muted">
                      Your 5 latest submissions tracked directly through the municipal ledger
                    </p>
                  </div>

                  {reportsList.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={() => {
                        setActiveTab("reports");
                        loadFullReports();
                      }}
                      className="text-xs text-accent hover:underline cursor-pointer gap-1"
                    >
                      View All Reports <ArrowRight className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Table or Empty State */}
                {isLoading ? (
                  <div className="rounded-2xl border border-border bg-surface p-12 text-center space-y-3">
                    <span className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin inline-block" />
                    <p className="text-xs text-muted">Loading your recent reports...</p>
                  </div>
                ) : reportsList.length === 0 ? (
                  /* Empty state */
                  <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center space-y-4">
                    <div className="h-12 w-12 rounded-2xl bg-surface-secondary text-muted flex items-center justify-center mx-auto">
                      <FileSpreadsheet className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-foreground">
                        No Infrastructure Reports Yet
                      </h4>
                      <p className="text-xs text-muted max-w-sm mx-auto">
                        You have not reported any civic infrastructure issues. Notice a problem in
                        your neighborhood? Report an issue to begin.
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onPress={() => router.push("/citizen/report-issue")}
                      className="cursor-pointer gap-1.5"
                    >
                      <PlusCircle className="h-4 w-4" /> Log Your First Report
                    </Button>
                  </div>
                ) : (
                  /* Table view for desktop, card stack for mobile */
                  <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-surface-secondary/50 border-b border-border text-muted font-bold uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="py-3 px-4">Title & ID</th>
                            <th className="py-3 px-4">Category</th>
                            <th className="py-3 px-4">Submitted</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">Priority</th>
                            <th className="py-3 px-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {reportsList.slice(0, 5).map((item) => {
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
                                  <div className="font-semibold text-foreground text-xs">
                                    {item.title}
                                  </div>
                                  <span className="font-mono text-[10px] text-muted">
                                    #{item._id.slice(-6).toUpperCase()}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-muted font-medium">
                                  {item.category}
                                </td>
                                <td className="py-3 px-4 text-muted">{formattedDate}</td>
                                <td className="py-3 px-4">
                                  <Chip color={statusMeta.color} variant="soft" size="sm">
                                    {statusMeta.label}
                                  </Chip>
                                </td>
                                <td className="py-3 px-4">
                                  <Chip color={priorityMeta.color} variant="secondary" size="sm">
                                    {priorityMeta.label}
                                  </Chip>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onPress={() => setSelectedIssue(item)}
                                    className="cursor-pointer text-[11px]"
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
            </div>
          )}

          {/* =====================================================================
              TAB: MY REPORTS (Comprehensive filterable list)
              ===================================================================== */}
          {activeTab === "reports" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-foreground">
                    All Citizen Reports
                  </h2>
                  <p className="text-xs text-muted">
                    Filter and track the complete lifecycle of issues you reported
                  </p>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onPress={() => router.push("/citizen/report-issue")}
                  className="gap-1.5 cursor-pointer font-medium self-start sm:self-auto"
                >
                  <PlusCircle className="h-4 w-4" /> Report New Issue
                </Button>
              </div>

              {/* Filter bar */}
              <div className="rounded-2xl border border-border bg-surface p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Search */}
                <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search your reports..."
                    className="w-full rounded-xl border border-border bg-surface-secondary/40 pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                  />
                </form>

                {/* Status Chips */}
                <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                  <span className="text-xs text-muted font-medium mr-1 flex items-center gap-1">
                    <Filter className="h-3 w-3" /> Status:
                  </span>
                  {[
                    { key: "all", label: "All" },
                    { key: "submitted", label: "Submitted" },
                    { key: "in_progress", label: "In Progress" },
                    { key: "resolved", label: "Resolved" },
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => handleStatusFilterChange(filter.key)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                        statusFilter === filter.key
                          ? "border-accent bg-accent/15 text-accent font-semibold"
                          : "border-border/60 bg-surface-secondary/30 text-muted hover:text-foreground"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reports List */}
              {isLoading ? (
                <div className="rounded-2xl border border-border bg-surface p-12 text-center space-y-3">
                  <span className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin inline-block" />
                  <p className="text-xs text-muted">Updating reports list...</p>
                </div>
              ) : reportsList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center space-y-3">
                  <p className="text-sm font-semibold text-foreground">
                    No reports match the selected filter.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => handleStatusFilterChange("all")}
                    className="cursor-pointer text-xs"
                  >
                    Clear Filter
                  </Button>
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-secondary/50 border-b border-border text-muted font-bold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Title & ID</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Submitted</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Priority</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {reportsList.map((item) => {
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
                                <div className="font-semibold text-foreground text-xs">
                                  {item.title}
                                </div>
                                <span className="font-mono text-[10px] text-muted">
                                  #{item._id.slice(-6).toUpperCase()}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-muted font-medium">
                                {item.category}
                              </td>
                              <td className="py-3 px-4 text-muted">{formattedDate}</td>
                              <td className="py-3 px-4">
                                <Chip color={statusMeta.color} variant="soft" size="sm">
                                  {statusMeta.label}
                                </Chip>
                              </td>
                              <td className="py-3 px-4">
                                <Chip color={priorityMeta.color} variant="secondary" size="sm">
                                  {priorityMeta.label}
                                </Chip>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onPress={() => setSelectedIssue(item)}
                                  className="cursor-pointer text-[11px]"
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
          )}

          {/* =====================================================================
              TAB: PROFILE SETTINGS
              ===================================================================== */}
          {activeTab === "profile" && (
            <div className="space-y-6 max-w-2xl animate-in fade-in">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-foreground">
                  Citizen Profile Settings
                </h2>
                <p className="text-xs text-muted">
                  Account credentials and municipal citizen verification status
                </p>
              </div>

              <Card className="border border-border bg-surface rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-accent text-accent-foreground flex items-center justify-center font-bold text-2xl shadow-xs">
                    {user?.name?.charAt(0).toUpperCase() || "C"}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{user?.name}</h3>
                    <p className="text-xs text-muted">{user?.email}</p>
                    <div className="pt-1.5 flex items-center gap-2">
                      <Chip color="success" variant="soft" size="sm">
                        <ShieldCheck className="h-3 w-3 mr-1 inline" /> Citizen Account
                      </Chip>
                      <span className="text-[11px] text-muted font-mono">
                        ID: {user?._id?.slice(-8).toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-border/80" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="rounded-xl border border-border/80 bg-surface-secondary/40 p-3 space-y-1">
                    <span className="text-muted block uppercase font-bold text-[10px]">
                      Full Name
                    </span>
                    <span className="font-semibold text-foreground text-sm">
                      {user?.name}
                    </span>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-surface-secondary/40 p-3 space-y-1">
                    <span className="text-muted block uppercase font-bold text-[10px]">
                      Email Address
                    </span>
                    <span className="font-semibold text-foreground text-sm">
                      {user?.email}
                    </span>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-surface-secondary/40 p-3 space-y-1">
                    <span className="text-muted block uppercase font-bold text-[10px]">
                      Contact Phone
                    </span>
                    <span className="font-semibold text-foreground text-sm">
                      {user?.phone || "No phone registered"}
                    </span>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-surface-secondary/40 p-3 space-y-1">
                    <span className="text-muted block uppercase font-bold text-[10px]">
                      Account Role
                    </span>
                    <span className="font-semibold text-foreground text-sm uppercase">
                      {user?.role}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-border/60">
                  <span className="text-xs text-muted">
                    Managed securely via CivicPulse Auth Architecture
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={logout}
                    className="cursor-pointer text-danger hover:bg-danger/10"
                  >
                    <LogOut className="h-4 w-4" /> Sign Out
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* =========================================================================
          3. Modals & Overlays
          ========================================================================= */}
      {/* Issue Details Inspection Modal */}
      <IssueDetailsModal
        issue={selectedIssue}
        onClose={() => setSelectedIssue(null)}
      />
    </div>
  );
}
