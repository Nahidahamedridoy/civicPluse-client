"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Chip } from "@heroui/react";
import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Play,
  RefreshCw,
  Search,
  Wrench,
  X,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { getDashboardPath } from "@/lib/auth";
import {
  StaffActivityItem,
  StaffDashboardData,
  StaffIssue,
  fetchStaffAssignedIssues,
  fetchStaffDashboard,
  fetchStaffIssueActivity,
  getStaffPriorityMeta,
  getStaffStatusMeta,
  updateStaffTaskStatus,
} from "@/lib/staff-api";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { StaffTaskModal } from "@/components/staff/staff-task-modal";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "assigned", label: "Assigned (New)" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const PRIORITY_FILTER_OPTIONS = [
  { value: "all", label: "All Priorities" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export default function StaffDashboardPage() {
  const router = useRouter();
  const { user, token, role, isAuthenticated, isMounted, logout } = useAuth();

  // Mobile sidebar drawer state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Dashboard KPI data
  const [dashboardData, setDashboardData] = useState<StaffDashboardData | null>(null);

  // Assigned Tasks list states
  const [assignedIssues, setAssignedIssues] = useState<StaffIssue[]>([]);
  const [recentActivities, setRecentActivities] = useState<StaffActivityItem[]>([]);
  const [totalAssigned, setTotalAssigned] = useState(0);

  // Search & Filter states
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Pagination state
  const [page, setPage] = useState(1);
  const limit = 8;
  const [totalPages, setTotalPages] = useState(1);

  // Loading & error feedback
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal inspection & progress update state
  const [selectedTask, setSelectedTask] = useState<StaffIssue | null>(null);

  // Route protection
  useEffect(() => {
    if (!isMounted) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    const normalizedRole = role?.toLowerCase().trim();
    if (normalizedRole && normalizedRole !== "maintenance_staff") {
      router.replace(getDashboardPath(role || undefined));
    }
  }, [isMounted, isAuthenticated, role, router]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load dashboard metrics and issues
  const loadStaffData = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [dashRes, issuesRes] = await Promise.all([
        fetchStaffDashboard(token),
        fetchStaffAssignedIssues(token, {
          page,
          limit,
          search: debouncedSearch,
          status: statusFilter,
          priority: priorityFilter,
        }),
      ]);

      setDashboardData(dashRes);
      setAssignedIssues(issuesRes.issues);
      setTotalAssigned(issuesRes.total);
      setTotalPages(issuesRes.totalPages);

      // Load activity from top issue if available
      if (issuesRes.issues.length > 0) {
        const actRes = await fetchStaffIssueActivity(token, issuesRes.issues[0]._id);
        setRecentActivities(actRes.slice(0, 5));
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to load maintenance staff dashboard."
      );
    } finally {
      setIsLoading(false);
    }
  }, [token, page, limit, debouncedSearch, statusFilter, priorityFilter]);

  useEffect(() => {
    if (!isMounted || !isAuthenticated || !token) return;
    const normalizedRole = role?.toLowerCase().trim();
    if (normalizedRole !== "maintenance_staff") return;

    let active = true;

    Promise.all([
      fetchStaffDashboard(token),
      fetchStaffAssignedIssues(token, {
        page,
        limit,
        search: debouncedSearch,
        status: statusFilter,
        priority: priorityFilter,
      }),
    ])
      .then(async ([dashRes, issuesRes]) => {
        if (!active) return;
        setDashboardData(dashRes);
        setAssignedIssues(issuesRes.issues);
        setTotalAssigned(issuesRes.total);
        setTotalPages(issuesRes.totalPages);
        setErrorMessage(null);

        if (issuesRes.issues.length > 0) {
          const actRes = await fetchStaffIssueActivity(token, issuesRes.issues[0]._id);
          if (active) setRecentActivities(actRes.slice(0, 5));
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Failed to load maintenance staff dashboard."
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    isMounted,
    isAuthenticated,
    role,
    token,
    page,
    limit,
    debouncedSearch,
    statusFilter,
    priorityFilter,
  ]);

  // Quick Action: Start Work from table card
  const handleQuickStart = async (task: StaffIssue, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;

    try {
      const res = await updateStaffTaskStatus(
        token,
        task._id,
        "in_progress",
        "Field technician began maintenance response."
      );
      setSuccessMessage(res.message);
      loadStaffData();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to begin task."
      );
    }
  };

  // KPI Calculations
  const totalAssignedTasks = dashboardData?.summary?.assignedIssues ?? totalAssigned;
  const inProgressTasks = dashboardData?.summary?.inProgressIssues ?? 0;
  const completedTasks = dashboardData?.summary?.resolvedIssues ?? 0;
  const pendingTasks = Math.max(0, totalAssignedTasks - inProgressTasks - completedTasks);

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
                <Wrench className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight text-foreground">
                  Civic<span className="text-accent">Pulse</span>
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted -mt-0.5">
                  Field Operations
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
              href="/staff/dashboard"
              onClick={() => setMobileSidebarOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold bg-accent text-accent-foreground shadow-xs transition-all cursor-pointer"
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              <span>Staff Dashboard</span>
            </Link>

            <Link
              href="/staff/dashboard"
              onClick={() => setMobileSidebarOpen(false)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-secondary/70 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <FileCheck2 className="h-4 w-4 shrink-0 group-hover:text-accent transition-colors" />
                <span>Assigned Tasks</span>
              </div>
              {totalAssignedTasks > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-surface-secondary text-muted group-hover:bg-accent/20 group-hover:text-accent transition-colors">
                  {totalAssignedTasks}
                </span>
              )}
            </Link>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border space-y-3 bg-surface-secondary/20">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-bold text-xs shrink-0">
              {isMounted ? user?.name?.charAt(0).toUpperCase() || "S" : "S"}
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
                  Maintenance Staff Workspace
                </h1>
                <Chip color="warning" variant="soft" size="sm" className="hidden sm:inline-flex text-[10px]">
                  Field Crew
                </Chip>
              </div>
              <p className="text-[10px] text-muted hidden sm:block">
                Assigned infrastructure tasks, field progress updates, and completion logging
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              isIconOnly
              size="sm"
              onPress={loadStaffData}
              isDisabled={isLoading}
              aria-label="Refresh dashboard"
              className="cursor-pointer text-muted hover:text-foreground"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>

            <ThemeToggle />

            <div className="h-4 w-px bg-border mx-1 hidden sm:block" />

            <Chip color="accent" variant="soft" size="sm" className="hidden sm:inline-flex">
              <Wrench className="h-3 w-3 mr-1 inline" /> Maintenance Staff
            </Chip>
          </div>
        </header>

        {/* Workspace Body */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1">
          {/* Notifications */}
          {errorMessage && (
            <Alert className="border border-danger/40 bg-danger/10 text-danger rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onPress={loadStaffData}
                className="cursor-pointer text-xs shrink-0"
              >
                Retry
              </Button>
            </Alert>
          )}

          {successMessage && (
            <Alert className="border border-success/40 bg-success/10 text-success rounded-xl p-4 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>{successMessage}</span>
              </div>
              <Button
                variant="ghost"
                isIconOnly
                size="sm"
                onPress={() => setSuccessMessage(null)}
                className="cursor-pointer text-success"
              >
                <X className="h-4 w-4" />
              </Button>
            </Alert>
          )}

          {/* Welcome Banner */}
          <div className="rounded-2xl border border-border bg-gradient-to-r from-surface via-surface to-accent/5 p-6 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Chip color="accent" variant="soft" size="sm">
                  Field Technician Console
                </Chip>
                <span className="text-xs text-muted">Direct Department Assignment</span>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                Welcome back, {isMounted ? user?.name || "Technician" : "Technician"}!
              </h2>
              <p className="text-xs text-muted max-w-lg">
                View your repair assignments, update maintenance progress, and submit work completion
                reports for municipal inspection.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <span className="text-[10px] text-muted block uppercase font-bold">
                  Workload Status
                </span>
                <span className="text-sm font-bold text-accent">
                  {inProgressTasks} In Progress
                </span>
              </div>
            </div>
          </div>

          {/* Feature 1: Summary Statistics (4 Core Cards) */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
              Assignment Overview
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* 1. Total Assigned Tasks */}
              <Card className="border border-border bg-surface p-4 rounded-2xl shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    Total Assigned
                  </span>
                  <div className="p-2 rounded-xl bg-surface-secondary text-accent">
                    <FileSpreadsheet className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-foreground">
                    {isLoading ? "--" : totalAssignedTasks}
                  </div>
                  <span className="text-[10px] text-muted">Total allocated tasks</span>
                </div>
              </Card>

              {/* 2. Pending Tasks */}
              <Card className="border border-border bg-surface p-4 rounded-2xl shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-warning">
                    Pending Tasks
                  </span>
                  <div className="p-2 rounded-xl bg-warning/15 text-warning">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-foreground">
                    {isLoading ? "--" : pendingTasks}
                  </div>
                  <span className="text-[10px] text-muted">Awaiting your response</span>
                </div>
              </Card>

              {/* 3. In-Progress Tasks */}
              <Card className="border border-border bg-surface p-4 rounded-2xl shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                    In Progress
                  </span>
                  <div className="p-2 rounded-xl bg-accent/15 text-accent">
                    <Play className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-foreground">
                    {isLoading ? "--" : inProgressTasks}
                  </div>
                  <span className="text-[10px] text-muted">Actively repaired</span>
                </div>
              </Card>

              {/* 4. Completed Tasks */}
              <Card className="border border-border bg-surface p-4 rounded-2xl shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-success">
                    Completed Tasks
                  </span>
                  <div className="p-2 rounded-xl bg-success/15 text-success">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-foreground">
                    {isLoading ? "--" : completedTasks}
                  </div>
                  <span className="text-[10px] text-muted">Verified repairs</span>
                </div>
              </Card>
            </div>
          </div>

          {/* Search & Filter Strip */}
          <div className="p-4 rounded-2xl border border-border bg-surface shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search assigned tasks by title or description..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-surface-secondary/40 text-foreground text-xs focus:outline-hidden focus:border-accent"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 rounded-xl border border-border bg-surface text-foreground text-xs focus:outline-hidden focus:border-accent"
              >
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 rounded-xl border border-border bg-surface text-foreground text-xs focus:outline-hidden focus:border-accent"
              >
                {PRIORITY_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {(searchInput || statusFilter !== "all" || priorityFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => {
                    setSearchInput("");
                    setStatusFilter("all");
                    setPriorityFilter("all");
                    setPage(1);
                  }}
                  className="text-xs text-muted hover:text-foreground cursor-pointer"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Assigned Issues List & Recent Activity Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Task Cards Grid (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground">
                  Your Assigned Tasks ({totalAssigned})
                </h3>
                {isLoading && (
                  <span className="text-xs text-muted flex items-center gap-1.5">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Updating...
                  </span>
                )}
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((n) => (
                    <Card
                      key={n}
                      className="border border-border bg-surface p-5 rounded-2xl shadow-xs space-y-3 animate-pulse"
                    >
                      <div className="h-4 w-2/3 rounded bg-surface-secondary" />
                      <div className="h-3 w-full rounded bg-surface-secondary/70" />
                      <div className="h-8 rounded-xl bg-surface-secondary/40" />
                    </Card>
                  ))}
                </div>
              ) : assignedIssues.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-surface space-y-4">
                  <div className="h-12 w-12 rounded-2xl bg-surface-secondary text-muted flex items-center justify-center mx-auto">
                    <Wrench className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-foreground">No Tasks Assigned</h4>
                    <p className="text-xs text-muted max-w-sm mx-auto">
                      {debouncedSearch || statusFilter !== "all" || priorityFilter !== "all"
                        ? "No tasks match your filter criteria."
                        : "You currently have no maintenance tasks assigned to your queue."}
                    </p>
                  </div>
                  {(debouncedSearch || statusFilter !== "all" || priorityFilter !== "all") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => {
                        setSearchInput("");
                        setStatusFilter("all");
                        setPriorityFilter("all");
                      }}
                      className="cursor-pointer text-xs"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {assignedIssues.map((task) => {
                    const priorityMeta = getStaffPriorityMeta(task.priority);
                    const statusMeta = getStaffStatusMeta(task.status);
                    const formattedDate = new Date(task.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });

                    return (
                      <Card
                        key={task._id}
                        className="border border-border bg-surface hover:border-accent/40 p-4 sm:p-5 rounded-2xl shadow-xs transition-all space-y-3.5 flex flex-col justify-between"
                      >
                        <div className="space-y-2.5">
                          {/* Badges & ID */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[10px] text-muted">
                              #{task._id.slice(-6).toUpperCase()}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Chip
                                color={priorityMeta.color}
                                variant="secondary"
                                size="sm"
                                className="text-[10px]"
                              >
                                {priorityMeta.label}
                              </Chip>
                              <Chip
                                color={statusMeta.color}
                                variant="soft"
                                size="sm"
                                className="text-[10px]"
                              >
                                {statusMeta.label}
                              </Chip>
                            </div>
                          </div>

                          {/* Title & Description */}
                          <div>
                            <h4 className="text-sm font-bold text-foreground line-clamp-1">
                              {task.title}
                            </h4>
                            <p className="text-xs text-muted line-clamp-2 mt-1 leading-relaxed">
                              {task.description}
                            </p>
                          </div>

                          {/* Location & Category */}
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-1.5 text-muted">
                              <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
                              <span className="truncate">
                                {task.location?.address || "Address not provided"}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-muted pt-1">
                              <span className="bg-surface-secondary px-2 py-0.5 rounded-md font-medium">
                                {task.category}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> {formattedDate}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Card CTA Controls */}
                        <div className="pt-2 border-t border-border/70 flex items-center justify-between gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onPress={() => setSelectedTask(task)}
                            className="cursor-pointer text-xs font-semibold text-accent gap-1"
                          >
                            <Eye className="h-3.5 w-3.5" /> Details
                          </Button>

                          {task.status === "assigned" && (
                            <Button
                              variant="primary"
                              size="sm"
                              onPress={(e) => handleQuickStart(task, e as unknown as React.MouseEvent)}
                              className="cursor-pointer text-xs font-semibold gap-1"
                            >
                              <Play className="h-3.5 w-3.5" /> Start Work
                            </Button>
                          )}

                          {task.status === "in_progress" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onPress={() => setSelectedTask(task)}
                              className="cursor-pointer text-xs font-semibold text-success border-success/40 hover:bg-success/10 gap-1"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Update & Resolve
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-3.5 rounded-2xl border border-border bg-surface flex items-center justify-between gap-3 text-xs">
                  <span className="text-muted">
                    Page <strong className="text-foreground">{page}</strong> of{" "}
                    <strong className="text-foreground">{totalPages}</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      isDisabled={page <= 1 || isLoading}
                      onPress={() => setPage((p) => Math.max(1, p - 1))}
                      className="cursor-pointer text-xs"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      isDisabled={page >= totalPages || isLoading}
                      onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="cursor-pointer text-xs"
                    >
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Task Activity Sidebar (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-accent" /> Recent Task Activity
              </h3>

              <Card className="border border-border bg-surface p-4 sm:p-5 rounded-2xl shadow-xs space-y-3">
                {recentActivities.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted">
                    No recent maintenance activities recorded.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentActivities.map((act) => (
                      <div
                        key={act._id}
                        className="p-3 rounded-xl border border-border bg-surface-secondary/20 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-foreground capitalize">
                            {act.action.replace("_", " ")}
                          </span>
                          <span className="text-muted font-mono">
                            {new Date(act.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted line-clamp-2 leading-relaxed">
                          {act.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-border/60 text-center">
                  <span className="text-[11px] text-muted">
                    Telemetry updated in real time
                  </span>
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>

      {/* Task Inspection & Report Modal */}
      <StaffTaskModal
        isOpen={Boolean(selectedTask)}
        task={selectedTask}
        token={token || ""}
        onClose={() => setSelectedTask(null)}
        onSuccess={(_, msg) => {
          setSuccessMessage(msg);
          loadStaffData();
        }}
      />
    </div>
  );
}
