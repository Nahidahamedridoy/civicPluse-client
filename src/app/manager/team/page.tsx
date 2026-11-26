"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Chip } from "@heroui/react";
import {
  Activity,
  AlertCircle,
  ArrowUpDown,
  Building,
  CheckCircle2,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  LayoutDashboard,
  LayoutGrid,
  LayoutList,
  LogOut,
  Mail,
  Menu,
  Phone,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { getDashboardPath } from "@/lib/auth";
import {
  DepartmentWorkloadData,
  ManagerIssue,
  StaffWorkloadItem,
  fetchDepartmentIssues,
  fetchDepartmentWorkload,
} from "@/lib/manager-api";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { StaffTasksModal } from "@/components/manager/staff-tasks-modal";
import { IssueDetailsModal } from "@/components/citizen/issue-details-modal";

const WORKLOAD_STATUS_OPTIONS = [
  { value: "all", label: "All Workloads" },
  { value: "available", label: "Available (0 Active)" },
  { value: "active", label: "Active (1-2 Tasks)" },
  { value: "moderate", label: "Moderate (3-5 Tasks)" },
  { value: "heavy", label: "Heavy Load (> 5 Tasks)" },
];

const SORT_OPTIONS = [
  { value: "name_asc", label: "Name (A–Z)" },
  { value: "name_desc", label: "Name (Z–A)" },
  { value: "workload_desc", label: "Active Workload (High → Low)" },
  { value: "workload_asc", label: "Active Workload (Low → High)" },
  { value: "resolved_desc", label: "Completed Tasks (High → Low)" },
];

export default function ManagerTeamPage() {
  const router = useRouter();
  const { user, token, role, isAuthenticated, isMounted, logout } = useAuth();

  // Mobile sidebar drawer state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Search, filter & sort states
  const [searchInput, setSearchInput] = useState("");
  const [workloadStatusFilter, setWorkloadStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name_asc");

  // Presentation view mode
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Data & loading states
  const [workloadData, setWorkloadData] = useState<DepartmentWorkloadData | null>(null);
  const [departmentIssues, setDepartmentIssues] = useState<ManagerIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Staff Tasks modal state
  const [selectedStaffItem, setSelectedStaffItem] = useState<StaffWorkloadItem | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<"tasks" | "assign">("tasks");

  // Issue details modal state
  const [selectedIssueForDetails, setSelectedIssueForDetails] = useState<ManagerIssue | null>(null);

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

  // Load team data & department issues
  const loadTeamData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [workloadRes, issuesRes] = await Promise.all([
        fetchDepartmentWorkload(token, 100),
        fetchDepartmentIssues(token, { limit: 100 }),
      ]);

      setWorkloadData(workloadRes);
      setDepartmentIssues(issuesRes.issues || []);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load department team workload data."
      );
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isMounted || !isAuthenticated || !token) return;

    const normalizedRole = role?.toLowerCase().trim();
    if (normalizedRole !== "department_manager" && normalizedRole !== "manager") return;

    let active = true;
    Promise.all([
      fetchDepartmentWorkload(token, 100),
      fetchDepartmentIssues(token, { limit: 100 }),
    ])
      .then(([workloadRes, issuesRes]) => {
        if (!active) return;
        setWorkloadData(workloadRes);
        setDepartmentIssues(issuesRes.issues || []);
        setErrorMessage(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to load department team workload data."
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isMounted, isAuthenticated, role, token]);

  const rawStaffList = useMemo(() => workloadData?.staffWorkload || [], [workloadData]);
  const departmentInfo = workloadData?.department;

  // Workload summary metrics
  const totalStaffCount = workloadData?.totalStaff || rawStaffList.length;
  const totalActiveTasks = rawStaffList.reduce((sum, item) => sum + item.activeWorkload, 0);
  const totalResolvedTasks = rawStaffList.reduce((sum, item) => sum + item.resolved, 0);
  const availableStaffCount = rawStaffList.filter((item) => item.activeWorkload === 0).length;

  // Filter & sort staff list
  const filteredStaffList = useMemo(() => {
    let list = [...rawStaffList];

    // Search query filter
    const query = searchInput.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (item) =>
          item.staff.name.toLowerCase().includes(query) ||
          item.staff.email.toLowerCase().includes(query) ||
          (item.staff.phone && item.staff.phone.includes(query))
      );
    }

    // Workload status filter
    if (workloadStatusFilter === "available") {
      list = list.filter((item) => item.activeWorkload === 0);
    } else if (workloadStatusFilter === "active") {
      list = list.filter((item) => item.activeWorkload >= 1 && item.activeWorkload <= 2);
    } else if (workloadStatusFilter === "moderate") {
      list = list.filter((item) => item.activeWorkload >= 3 && item.activeWorkload <= 5);
    } else if (workloadStatusFilter === "heavy") {
      list = list.filter((item) => item.activeWorkload > 5);
    }

    // Sort
    switch (sortBy) {
      case "name_desc":
        return list.sort((a, b) => b.staff.name.localeCompare(a.staff.name));
      case "workload_desc":
        return list.sort((a, b) => b.activeWorkload - a.activeWorkload);
      case "workload_asc":
        return list.sort((a, b) => a.activeWorkload - b.activeWorkload);
      case "resolved_desc":
        return list.sort((a, b) => b.resolved - a.resolved);
      case "name_asc":
      default:
        return list.sort((a, b) => a.staff.name.localeCompare(b.staff.name));
    }
  }, [rawStaffList, searchInput, workloadStatusFilter, sortBy]);

  const hasActiveFilters = searchInput.trim() !== "" || workloadStatusFilter !== "all" || sortBy !== "name_asc";

  const handleResetFilters = () => {
    setSearchInput("");
    setWorkloadStatusFilter("all");
    setSortBy("name_asc");
  };

  const openStaffModal = (staffItem: StaffWorkloadItem, initialTab: "tasks" | "assign" = "tasks") => {
    setSelectedStaffItem(staffItem);
    setModalInitialTab(initialTab);
  };

  const handleIssueAssigned = (assignedIssue: ManagerIssue, staffName: string) => {
    setSuccessMessage(`Successfully assigned issue "${assignedIssue.title}" to ${staffName}.`);
    // Refresh backend data to update counts
    loadTeamData();
  };

  // Compute tasks currently assigned to selected staff member
  const selectedStaffAssignedIssues = useMemo(() => {
    if (!selectedStaffItem) return [];
    return departmentIssues.filter(
      (issue) => issue.assignedTo && issue.assignedTo._id === selectedStaffItem.staff._id
    );
  }, [departmentIssues, selectedStaffItem]);

  // Compute available issues to assign (all active or unassigned department issues)
  const availableDepartmentIssues = useMemo(() => {
    return departmentIssues.filter(
      (issue) => !["resolved", "closed"].includes(issue.status?.toLowerCase())
    );
  }, [departmentIssues]);

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
                  Manager Portal
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

          {/* Department Badge */}
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
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-secondary/70 transition-all cursor-pointer"
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
              {departmentIssues.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-surface-secondary text-muted group-hover:bg-accent/20 group-hover:text-accent transition-colors">
                  {departmentIssues.length}
                </span>
              )}
            </Link>

            <Link
              href="/manager/team"
              onClick={() => setMobileSidebarOpen(false)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold bg-accent text-accent-foreground shadow-xs transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 shrink-0" />
                <span>Team Management</span>
              </div>
              {totalStaffCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-white/20 text-white">
                  {totalStaffCount}
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
                  Department Team Management
                </h1>
                {departmentInfo && (
                  <Chip
                    color="accent"
                    variant="soft"
                    size="sm"
                    className="hidden sm:inline-flex text-[10px]"
                  >
                    {departmentInfo.name}
                  </Chip>
                )}
              </div>
              <p className="text-[10px] text-muted hidden sm:block">
                Maintenance crew directory, individual task workloads, and repair assignments
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              isIconOnly
              size="sm"
              onPress={loadTeamData}
              isDisabled={isLoading}
              aria-label="Refresh team data"
              className="cursor-pointer text-muted hover:text-foreground"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>

            <ThemeToggle />

            <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />

            <Chip color="accent" variant="soft" size="sm" className="hidden sm:inline-flex">
              <ShieldCheck className="h-3 w-3 mr-1 inline" /> Department Manager
            </Chip>
          </div>
        </header>

        {/* Main Content Body */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1">
          {/* Header Title & View Mode Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                Maintenance Crew & Workload
              </h2>
              <p className="text-xs text-muted mt-0.5">
                {departmentInfo
                  ? `Maintenance personnel stationed in ${departmentInfo.name} (${departmentInfo.code})`
                  : "Maintenance personnel in your department"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex items-center rounded-xl border border-border bg-surface p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  aria-label="Table view"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === "table"
                      ? "bg-accent text-accent-foreground shadow-xs"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <LayoutList className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-accent text-accent-foreground shadow-xs"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Cards</span>
                </button>
              </div>

              <Link href="/manager/issues">
                <Button variant="outline" size="sm" className="cursor-pointer text-xs gap-1.5">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Issues
                </Button>
              </Link>
            </div>
          </div>

          {/* Feedback Success Alert */}
          {successMessage && (
            <Alert className="border border-success/40 bg-success/10 text-success rounded-xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span className="font-medium">{successMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="text-xs font-semibold hover:underline cursor-pointer shrink-0"
              >
                Dismiss
              </button>
            </Alert>
          )}

          {/* Feedback Error Alert with Retry */}
          {errorMessage && (
            <Alert className="border border-danger/40 bg-danger/10 text-danger rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 sm:mt-0" />
                <div className="text-xs">
                  <span className="font-bold block">Unable to load team management data</span>
                  <span>{errorMessage}</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onPress={loadTeamData}
                className="cursor-pointer text-xs shrink-0"
              >
                Retry
              </Button>
            </Alert>
          )}

          {/* Workload Summary Cards (KPIs) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-border bg-surface p-5 rounded-2xl shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  Total Crew Members
                </span>
                <div className="rounded-xl bg-surface-secondary p-2 text-accent">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-foreground">
                  {isLoading ? "--" : totalStaffCount}
                </div>
                <span className="text-xs text-muted">Active maintenance staff</span>
              </div>
            </Card>

            <Card className="border border-border bg-surface p-5 rounded-2xl shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  Total Active Tasks
                </span>
                <div className="rounded-xl bg-accent/15 p-2 text-accent">
                  <Wrench className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-accent">
                  {isLoading ? "--" : totalActiveTasks}
                </div>
                <span className="text-xs text-muted">Assigned & in-progress repairs</span>
              </div>
            </Card>

            <Card className="border border-border bg-surface p-5 rounded-2xl shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  Available Crew
                </span>
                <div className="rounded-xl bg-success/15 p-2 text-success">
                  <UserCheck className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-success">
                  {isLoading ? "--" : availableStaffCount}
                </div>
                <span className="text-xs text-muted">0 active workload</span>
              </div>
            </Card>

            <Card className="border border-border bg-surface p-5 rounded-2xl shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  Completed by Team
                </span>
                <div className="rounded-xl bg-surface-secondary p-2 text-success">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-foreground">
                  {isLoading ? "--" : totalResolvedTasks}
                </div>
                <span className="text-xs text-muted">Historical resolutions</span>
              </div>
            </Card>
          </div>

          {/* Search & Filter Toolbar */}
          <Card className="border border-border bg-surface p-4 rounded-2xl shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
              {/* Search Box */}
              <div className="lg:col-span-5 relative">
                <Search className="h-4 w-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search staff by name, email, or phone..."
                  aria-label="Search staff members"
                  className="w-full h-10 rounded-xl border border-border bg-surface-secondary/40 pl-9 pr-8 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => setSearchInput("")}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Workload Status Filter */}
              <div className="lg:col-span-4">
                <select
                  aria-label="Filter by workload status"
                  value={workloadStatusFilter}
                  onChange={(e) => setWorkloadStatusFilter(e.target.value)}
                  className="w-full h-10 rounded-xl border border-border bg-surface-secondary/40 px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {WORKLOAD_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Select */}
              <div className="lg:col-span-3 relative">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  aria-label="Sort staff members"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full h-10 rounded-xl border border-border bg-surface-secondary/40 pl-8 pr-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filter Count & Reset Button */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <span className="text-muted">
                {isLoading
                  ? "Loading maintenance staff records..."
                  : `Showing ${filteredStaffList.length} of ${rawStaffList.length} staff ${
                      rawStaffList.length === 1 ? "member" : "members"
                    }`}
              </span>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={handleResetFilters}
                  className="cursor-pointer text-xs text-accent gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Filters
                </Button>
              )}
            </div>
          </Card>

          {/* Main Roster: Loading / Empty / Table / Grid */}
          {isLoading ? (
            <div className="rounded-2xl border border-border bg-surface p-14 text-center space-y-3">
              <span className="h-7 w-7 border-2 border-accent border-t-transparent rounded-full animate-spin inline-block" />
              <p className="text-xs text-muted font-medium">
                Loading department staff and workloads...
              </p>
            </div>
          ) : rawStaffList.length === 0 ? (
            /* Global Empty State: No staff in department */
            <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-surface-secondary text-muted flex items-center justify-center mx-auto">
                <Users className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">
                  No Maintenance Staff Assigned
                </h3>
                <p className="text-xs text-muted max-w-md mx-auto">
                  There are currently no maintenance staff members assigned to your department.
                  Contact an administrator to onboard and assign personnel to your department.
                </p>
              </div>
              <Link href="/manager/dashboard">
                <Button variant="outline" size="sm" className="cursor-pointer gap-1.5 text-xs">
                  <LayoutDashboard className="h-4 w-4" /> Return to Dashboard
                </Button>
              </Link>
            </div>
          ) : filteredStaffList.length === 0 ? (
            /* Filter Empty State */
            <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center space-y-3">
              <p className="text-sm font-semibold text-foreground">
                No Staff Members Match Your Filter
              </p>
              <p className="text-xs text-muted max-w-sm mx-auto">
                No maintenance staff members matched &quot;{searchInput}&quot; or the chosen workload status.
              </p>
              <Button
                variant="outline"
                size="sm"
                onPress={handleResetFilters}
                className="cursor-pointer gap-1.5 text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Clear Filters
              </Button>
            </div>
          ) : viewMode === "table" ? (
            /* TABLE VIEW */
            <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-secondary/50 border-b border-border text-muted font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Staff Member</th>
                      <th className="py-3.5 px-4">Contact</th>
                      <th className="py-3.5 px-4 text-center">Assigned</th>
                      <th className="py-3.5 px-4 text-center">In Progress</th>
                      <th className="py-3.5 px-4 text-center">Completed</th>
                      <th className="py-3.5 px-4 text-center">Current Workload</th>
                      <th className="py-3.5 px-4 text-center">Capacity</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredStaffList.map((item) => {
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
                        workloadBadge = { label: "Heavy Load", color: "danger" };
                      } else if (activeWorkload > 2) {
                        workloadBadge = { label: "Moderate Load", color: "warning" };
                      } else if (activeWorkload > 0) {
                        workloadBadge = { label: "Active", color: "accent" };
                      }

                      return (
                        <tr
                          key={staff._id}
                          className="hover:bg-surface-secondary/40 transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-bold text-xs shrink-0">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-foreground text-xs truncate">
                                  {staff.name}
                                </div>
                                <span className="text-[10px] text-muted">
                                  Maintenance Staff
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-muted">
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <Mail className="h-3 w-3 text-muted shrink-0" />
                              <span className="truncate max-w-[150px]">{staff.email}</span>
                            </div>
                            {staff.phone && (
                              <div className="flex items-center gap-1.5 text-[10px] text-muted mt-0.5">
                                <Phone className="h-3 w-3 text-muted shrink-0" />
                                <span>{staff.phone}</span>
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center font-mono font-medium text-foreground">
                            {assigned}
                          </td>

                          <td className="py-3.5 px-4 text-center font-mono font-medium text-accent">
                            {inProgress}
                          </td>

                          <td className="py-3.5 px-4 text-center font-mono font-medium text-success">
                            {resolved}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className="font-mono font-black text-foreground text-sm">
                              {activeWorkload}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <Chip color={workloadBadge.color} variant="soft" size="sm">
                              {workloadBadge.label}
                            </Chip>
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <Button
                                variant="primary"
                                size="sm"
                                onPress={() => openStaffModal(item, "assign")}
                                className="cursor-pointer text-[11px] h-7 px-2.5 font-semibold gap-1"
                              >
                                <PlusCircle className="h-3 w-3" />
                                Assign Issue
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onPress={() => openStaffModal(item, "tasks")}
                                className="cursor-pointer text-[11px] h-7 px-2.5 font-medium gap-1"
                              >
                                <Eye className="h-3 w-3 text-accent" />
                                View Tasks ({activeWorkload})
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* GRID / CARD VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredStaffList.map((item) => {
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
                  workloadBadge = { label: "Heavy Load", color: "danger" };
                } else if (activeWorkload > 2) {
                  workloadBadge = { label: "Moderate Load", color: "warning" };
                } else if (activeWorkload > 0) {
                  workloadBadge = { label: "Active", color: "accent" };
                }

                return (
                  <Card
                    key={staff._id}
                    className="border border-border bg-surface p-5 rounded-2xl shadow-xs flex flex-col justify-between space-y-4 hover:border-accent/40 transition-colors"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-bold text-sm shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-foreground truncate">
                              {staff.name}
                            </h3>
                            <span className="text-[10px] text-muted">Maintenance Staff</span>
                          </div>
                        </div>

                        <Chip color={workloadBadge.color} variant="soft" size="sm">
                          {workloadBadge.label}
                        </Chip>
                      </div>

                      <div className="space-y-1 text-xs text-muted pt-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="h-3.5 w-3.5 text-muted shrink-0" />
                          <span className="truncate">{staff.email}</span>
                        </div>
                        {staff.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-muted shrink-0" />
                            <span>{staff.phone}</span>
                          </div>
                        )}
                      </div>

                      {/* Workload metric counters */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-center">
                        <div className="p-2 rounded-xl bg-surface-secondary/40">
                          <span className="text-[10px] font-bold uppercase text-muted block">
                            Assigned
                          </span>
                          <span className="text-sm font-black text-foreground mt-0.5 block">
                            {assigned}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-surface-secondary/40">
                          <span className="text-[10px] font-bold uppercase text-muted block">
                            In Progress
                          </span>
                          <span className="text-sm font-black text-accent mt-0.5 block">
                            {inProgress}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-surface-secondary/40">
                          <span className="text-[10px] font-bold uppercase text-muted block">
                            Resolved
                          </span>
                          <span className="text-sm font-black text-success mt-0.5 block">
                            {resolved}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onPress={() => openStaffModal(item, "assign")}
                        className="cursor-pointer text-xs font-semibold gap-1.5 flex-1"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        Assign Issue
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onPress={() => openStaffModal(item, "tasks")}
                        className="cursor-pointer text-xs font-medium gap-1 flex-1"
                      >
                        <Eye className="h-3.5 w-3.5 text-accent" />
                        Tasks ({activeWorkload})
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* =========================================================================
          3. Staff Tasks & Issue Assignment Modal
          ========================================================================= */}
      {token && selectedStaffItem && (
        <StaffTasksModal
          key={`${selectedStaffItem.staff._id}-${modalInitialTab}`}
          staffItem={selectedStaffItem}
          assignedIssues={selectedStaffAssignedIssues}
          availableIssues={availableDepartmentIssues}
          token={token}
          initialTab={modalInitialTab}
          onClose={() => setSelectedStaffItem(null)}
          onIssueAssigned={handleIssueAssigned}
          onViewIssueDetails={(issue) => setSelectedIssueForDetails(issue)}
        />
      )}

      {/* =========================================================================
          4. Issue Details Modal (Reused)
          ========================================================================= */}
      <IssueDetailsModal
        issue={selectedIssueForDetails}
        onClose={() => setSelectedIssueForDetails(null)}
      />
    </div>
  );
}
