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
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Construction,
  Droplets,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Footprints,
  History,
  LayoutDashboard,
  LayoutGrid,
  LayoutList,
  Lightbulb,
  LogOut,
  MapPin,
  Menu,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { getDashboardPath } from "@/lib/auth";
import {
  ManagerIssue,
  StaffWorkloadItem,
  fetchDepartmentIssues,
  fetchDepartmentWorkload,
  getPriorityMeta,
  getStatusMeta,
} from "@/lib/manager-api";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ManagerIssueModal } from "@/components/manager/manager-issue-modal";

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Categories" },
  { value: "Road Damage", label: "Road Damage" },
  { value: "Streetlight", label: "Streetlight" },
  { value: "Drainage", label: "Drainage" },
  { value: "Footpath", label: "Footpath" },
  { value: "Waste Management", label: "Waste Management" },
  { value: "Public Infrastructure", label: "Public Infrastructure" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under Review" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "All Priorities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "priority_desc", label: "Priority (Urgent → Low)" },
  { value: "priority_asc", label: "Priority (Low → Urgent)" },
  { value: "title_asc", label: "Title (A–Z)" },
];

const PRIORITY_RANK: Record<string, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function CategoryBadgeIcon({
  category,
  className,
}: {
  category?: string;
  className?: string;
}) {
  switch (category?.toLowerCase()) {
    case "road damage":
      return <Construction className={className} />;
    case "streetlight":
      return <Lightbulb className={className} />;
    case "drainage":
      return <Droplets className={className} />;
    case "footpath":
      return <Footprints className={className} />;
    case "waste management":
      return <Trash2 className={className} />;
    case "public infrastructure":
    default:
      return <Building className={className} />;
  }
}

export default function ManagerIssuesPage() {
  const router = useRouter();
  const { user, token, role, isAuthenticated, isMounted, logout } = useAuth();

  // Mobile sidebar state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Filter, Search & Sort states
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Pagination states
  const [page, setPage] = useState(1);
  const limit = 10;
  const [totalPages, setTotalPages] = useState(1);
  const [totalIssues, setTotalIssues] = useState(0);

  // View toggle (table vs grid)
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Data, loading, error & success states
  const [issues, setIssues] = useState<ManagerIssue[]>([]);
  const [staffList, setStaffList] = useState<StaffWorkloadItem[]>([]);
  const [departmentInfo, setDepartmentInfo] = useState<{
    _id: string;
    name: string;
    code: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal state
  const [modalIssue, setModalIssue] = useState<ManagerIssue | null>(null);
  const [modalFocus, setModalFocus] = useState<
    "overview" | "verify" | "assign" | "history"
  >("overview");

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

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load staff workload & department metadata once
  const loadDepartmentContext = useCallback(async () => {
    if (!token) return;
    const workloadRes = await fetchDepartmentWorkload(token, 100);
    if (workloadRes) {
      setDepartmentInfo(workloadRes.department);
      setStaffList(workloadRes.staffWorkload || []);
    }
  }, [token]);

  // Load department-scoped issues from backend
  const loadIssues = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetchDepartmentIssues(token, {
        status: statusFilter,
        category: categoryFilter,
        priority: priorityFilter,
        search: debouncedSearch,
        page,
        limit,
      });

      setIssues(res.issues || []);
      setTotalIssues(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while loading department issues."
      );
    } finally {
      setIsLoading(false);
    }
  }, [token, statusFilter, categoryFilter, priorityFilter, debouncedSearch, page]);

  useEffect(() => {
    if (!isMounted || !isAuthenticated || !token) return;

    const normalizedRole = role?.toLowerCase().trim();
    if (normalizedRole !== "department_manager" && normalizedRole !== "manager") return;

    let active = true;
    fetchDepartmentWorkload(token, 100).then((workloadRes) => {
      if (active && workloadRes) {
        setDepartmentInfo(workloadRes.department);
        setStaffList(workloadRes.staffWorkload || []);
      }
    });

    return () => {
      active = false;
    };
  }, [isMounted, isAuthenticated, role, token]);

  useEffect(() => {
    if (!isMounted || !isAuthenticated || !token) return;

    const normalizedRole = role?.toLowerCase().trim();
    if (normalizedRole !== "department_manager" && normalizedRole !== "manager") return;

    let active = true;
    fetchDepartmentIssues(token, {
      status: statusFilter,
      category: categoryFilter,
      priority: priorityFilter,
      search: debouncedSearch,
      page,
      limit,
    })
      .then((res) => {
        if (!active) return;
        setIssues(res.issues || []);
        setTotalIssues(res.total || 0);
        setTotalPages(res.totalPages || 1);
        setErrorMessage(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "An unexpected error occurred while loading department issues."
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
    statusFilter,
    categoryFilter,
    priorityFilter,
    debouncedSearch,
    page,
  ]);

  // Client-side sorting on the fetched page
  const sortedIssues = useMemo(() => {
    const list = [...issues];
    switch (sortBy) {
      case "oldest":
        return list.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      case "priority_desc":
        return list.sort(
          (a, b) =>
            (PRIORITY_RANK[b.priority?.toLowerCase()] || 0) -
            (PRIORITY_RANK[a.priority?.toLowerCase()] || 0)
        );
      case "priority_asc":
        return list.sort(
          (a, b) =>
            (PRIORITY_RANK[a.priority?.toLowerCase()] || 0) -
            (PRIORITY_RANK[b.priority?.toLowerCase()] || 0)
        );
      case "title_asc":
        return list.sort((a, b) => a.title.localeCompare(b.title));
      case "newest":
      default:
        return list.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
  }, [issues, sortBy]);

  const hasActiveFilters =
    statusFilter !== "all" ||
    categoryFilter !== "all" ||
    priorityFilter !== "all" ||
    debouncedSearch !== "" ||
    sortBy !== "newest";

  const handleResetFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setPriorityFilter("all");
    setSortBy("newest");
    setPage(1);
  };

  const openModalForIssue = (
    issue: ManagerIssue,
    focus: "overview" | "verify" | "assign" | "history" = "overview"
  ) => {
    setModalFocus(focus);
    setModalIssue(issue);
  };

  const handleIssueUpdated = (updatedIssue: ManagerIssue, feedbackMessage: string) => {
    setSuccessMessage(feedbackMessage);
    setIssues((prev) =>
      prev.map((item) => (item._id === updatedIssue._id ? updatedIssue : item))
    );
    // Refresh staff workload counts and issue list to reflect active filter/assignments
    loadDepartmentContext();
    loadIssues();
  };

  const handleRetry = () => {
    loadDepartmentContext();
    loadIssues();
  };

  const startRange = totalIssues === 0 ? 0 : (page - 1) * limit + 1;
  const endRange = Math.min(page * limit, totalIssues);

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
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold bg-accent text-accent-foreground shadow-xs transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-4 w-4 shrink-0" />
                <span>Issue Management</span>
              </div>
              {totalIssues > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-white/20 text-white">
                  {totalIssues}
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
              {staffList.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-surface-secondary text-muted group-hover:bg-accent/20 group-hover:text-accent transition-colors">
                  {staffList.length}
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
                  Department Issue Management
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
                Verify reports, set priorities, dispatch crew, and track resolution history
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              isIconOnly
              size="sm"
              onPress={handleRetry}
              isDisabled={isLoading}
              aria-label="Refresh issues"
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

        {/* Main Workspace */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1">
          {/* Page Header & View Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                Department Incident Registry
              </h2>
              <p className="text-xs text-muted mt-0.5">
                {departmentInfo
                  ? `Showing incidents assigned exclusively to ${departmentInfo.name} (${departmentInfo.code})`
                  : "Scoped exclusively to your assigned municipal department"}
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

              <Link href="/manager/dashboard">
                <Button variant="outline" size="sm" className="cursor-pointer text-xs gap-1.5">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>

          {/* Success Alert */}
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

          {/* Error Alert with Retry */}
          {errorMessage && (
            <Alert className="border border-danger/40 bg-danger/10 text-danger rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 sm:mt-0" />
                <div className="text-xs">
                  <span className="font-bold block">Failed to load department issues</span>
                  <span>{errorMessage}</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onPress={handleRetry}
                className="cursor-pointer text-xs shrink-0"
              >
                Retry
              </Button>
            </Alert>
          )}

          {/* Search, Filters & Sorting Toolbar */}
          <Card className="border border-border bg-surface p-4 rounded-2xl shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
              {/* Search Box */}
              <div className="lg:col-span-4 relative">
                <Search className="h-4 w-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search issues by title or description..."
                  aria-label="Search department issues"
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

              {/* Status Filter */}
              <div className="lg:col-span-2">
                <select
                  aria-label="Filter by status"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full h-10 rounded-xl border border-border bg-surface-secondary/40 px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div className="lg:col-span-2">
                <select
                  aria-label="Filter by category"
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full h-10 rounded-xl border border-border bg-surface-secondary/40 px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority Filter */}
              <div className="lg:col-span-2">
                <select
                  aria-label="Filter by priority"
                  value={priorityFilter}
                  onChange={(e) => {
                    setPriorityFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full h-10 rounded-xl border border-border bg-surface-secondary/40 px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Select */}
              <div className="lg:col-span-2 relative">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  aria-label="Sort issues"
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

            {/* Active Filters Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-xs text-muted">
                {isLoading
                  ? "Fetching department records..."
                  : `Showing ${startRange}–${endRange} of ${totalIssues} department ${
                      totalIssues === 1 ? "issue" : "issues"
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

          {/* Issues Content: Loading / Empty / Table / Grid */}
          {isLoading ? (
            <div className="rounded-2xl border border-border bg-surface p-14 text-center space-y-3">
              <span className="h-7 w-7 border-2 border-accent border-t-transparent rounded-full animate-spin inline-block" />
              <p className="text-xs text-muted font-medium">
                Loading department issues...
              </p>
            </div>
          ) : sortedIssues.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-surface-secondary text-muted flex items-center justify-center mx-auto">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">
                  {hasActiveFilters
                    ? "No Matching Department Issues"
                    : "No Issues Reported in Department"}
                </h3>
                <p className="text-xs text-muted max-w-md mx-auto">
                  {hasActiveFilters
                    ? "No issues match your current search or filter criteria. Try broadening your filters."
                    : "There are currently no civic incident reports assigned to your department."}
                </p>
              </div>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onPress={handleResetFilters}
                  className="cursor-pointer gap-1.5 text-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Clear All Filters
                </Button>
              )}
            </div>
          ) : viewMode === "table" ? (
            /* TABLE VIEW */
            <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-secondary/50 border-b border-border text-muted font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Issue & ID</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Location</th>
                      <th className="py-3.5 px-4">Priority</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Assigned Staff</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {sortedIssues.map((item) => {
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

                      const locationText =
                        item.location?.address ||
                        (item.location?.latitude != null &&
                        item.location?.longitude != null
                          ? `${item.location.latitude.toFixed(4)}, ${item.location.longitude.toFixed(4)}`
                          : "No location specified");

                      return (
                        <tr
                          key={item._id}
                          className="hover:bg-surface-secondary/40 transition-colors"
                        >
                          <td className="py-3.5 px-4 max-w-[240px]">
                            <button
                              type="button"
                              onClick={() => openModalForIssue(item, "overview")}
                              className="text-left group cursor-pointer"
                            >
                              <div className="font-semibold text-foreground text-xs line-clamp-1 group-hover:text-accent transition-colors">
                                {item.title}
                              </div>
                              <span className="font-mono text-[10px] text-muted">
                                #{item._id.slice(-6).toUpperCase()}
                              </span>
                            </button>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-muted font-medium">
                              <CategoryBadgeIcon
                                category={item.category}
                                className="h-3.5 w-3.5 text-accent shrink-0"
                              />
                              <span>{item.category}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 max-w-[180px]">
                            <div className="flex items-center gap-1 text-muted truncate">
                              <MapPin className="h-3 w-3 shrink-0 text-muted" />
                              <span className="truncate" title={locationText}>
                                {locationText}
                              </span>
                            </div>
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

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {item.assignedTo ? (
                              <span className="font-medium text-foreground">
                                {item.assignedTo.name}
                              </span>
                            ) : (
                              <span className="text-[11px] text-warning font-medium">
                                Unassigned
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-muted whitespace-nowrap">
                            {formattedDate}
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {item.status === "submitted" && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onPress={() => openModalForIssue(item, "verify")}
                                  className="cursor-pointer text-[11px] h-7 px-2.5 font-semibold gap-1"
                                >
                                  <ClipboardCheck className="h-3 w-3" />
                                  Verify
                                </Button>
                              )}

                              <Button
                                variant="outline"
                                size="sm"
                                onPress={() => openModalForIssue(item, "assign")}
                                className="cursor-pointer text-[11px] h-7 px-2.5 font-medium gap-1"
                              >
                                <UserCheck className="h-3 w-3 text-accent" />
                                {item.assignedTo ? "Reassign" : "Assign"}
                              </Button>

                              <Button
                                variant="ghost"
                                isIconOnly
                                size="sm"
                                aria-label="View issue details and history"
                                onPress={() => openModalForIssue(item, "history")}
                                className="cursor-pointer h-7 w-7 text-muted hover:text-accent"
                              >
                                <History className="h-3.5 w-3.5" />
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
              {sortedIssues.map((item) => {
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

                const locationText =
                  item.location?.address ||
                  (item.location?.latitude != null &&
                  item.location?.longitude != null
                    ? `${item.location.latitude.toFixed(4)}, ${item.location.longitude.toFixed(4)}`
                    : "No location specified");

                return (
                  <Card
                    key={item._id}
                    className="border border-border bg-surface p-5 rounded-2xl shadow-xs flex flex-col justify-between space-y-4 hover:border-accent/40 transition-colors"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md">
                          #{item._id.slice(-6).toUpperCase()}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Chip color={priorityMeta.color} variant="secondary" size="sm">
                            {priorityMeta.label}
                          </Chip>
                          <Chip color={statusMeta.color} variant="soft" size="sm">
                            {statusMeta.label}
                          </Chip>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-foreground line-clamp-2">
                          {item.title}
                        </h3>
                        <p className="text-xs text-muted mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      </div>

                      <div className="space-y-1.5 text-[11px] text-muted pt-1">
                        <div className="flex items-center gap-1.5">
                          <CategoryBadgeIcon
                            category={item.category}
                            className="h-3.5 w-3.5 text-accent shrink-0"
                          />
                          <span className="font-medium text-foreground">{item.category}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{locationText}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            {formattedDate}
                          </span>
                          <span className="flex items-center gap-1">
                            <UserCheck className="h-3.5 w-3.5 shrink-0 text-accent" />
                            {item.assignedTo ? (
                              <span className="text-foreground font-medium">
                                {item.assignedTo.name}
                              </span>
                            ) : (
                              <span className="text-warning font-medium">Unassigned</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {item.status === "submitted" && (
                          <Button
                            variant="primary"
                            size="sm"
                            onPress={() => openModalForIssue(item, "verify")}
                            className="cursor-pointer text-xs gap-1"
                          >
                            <ClipboardCheck className="h-3.5 w-3.5" />
                            Verify
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onPress={() => openModalForIssue(item, "assign")}
                          className="cursor-pointer text-xs gap-1"
                        >
                          <UserCheck className="h-3.5 w-3.5 text-accent" />
                          {item.assignedTo ? "Reassign" : "Assign"}
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => openModalForIssue(item, "overview")}
                        className="cursor-pointer text-xs text-accent gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Details & History
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {!isLoading && totalIssues > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <span className="text-xs text-muted">
                Page <strong className="text-foreground">{page}</strong> of{" "}
                <strong className="text-foreground">{totalPages}</strong> ({totalIssues} total)
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  isDisabled={page <= 1}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  className="cursor-pointer text-xs gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  isDisabled={page >= totalPages}
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="cursor-pointer text-xs gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* =========================================================================
          3. Manager Issue Details, Actions & History Modal
          ========================================================================= */}
      {token && modalIssue && (
        <ManagerIssueModal
          key={`${modalIssue._id}-${modalFocus}`}
          issue={modalIssue}
          token={token}
          staffList={staffList}
          initialFocusAction={modalFocus}
          onClose={() => setModalIssue(null)}
          onIssueUpdated={handleIssueUpdated}
        />
      )}
    </div>
  );
}
