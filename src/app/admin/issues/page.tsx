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
  LayoutDashboard,
  LayoutGrid,
  LayoutList,
  Lightbulb,
  LineChart,
  LogOut,
  MapPin,
  Menu,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  User,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { getDashboardPath } from "@/lib/auth";
import {
  AdminIssue,
  DepartmentOption,
  fetchActiveDepartments,
  fetchAdminIssues,
  getPriorityMeta,
  getStatusMeta,
} from "@/lib/admin-api";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { AdminIssueModal } from "@/components/admin/admin-issue-modal";

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

export default function AdminIssuesPage() {
  const router = useRouter();
  const { user, token, role, isAuthenticated, isMounted, logout } = useAuth();

  // Mobile sidebar drawer state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Filter, Search, Sort & Pagination states
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const [page, setPage] = useState(1);
  const limit = 10;
  const [totalPages, setTotalPages] = useState(1);
  const [totalIssues, setTotalIssues] = useState(0);

  // View Mode: Table vs Grid/Cards
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Data states
  const [issues, setIssues] = useState<AdminIssue[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal inspection & action state
  const [modalIssue, setModalIssue] = useState<AdminIssue | null>(null);
  const [modalFocus, setModalFocus] = useState<
    "overview" | "verify" | "assign" | "status" | "history"
  >("overview");

  // Route protection: Admin only
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

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load departments once for department filter & assignment
  useEffect(() => {
    if (!isMounted || !isAuthenticated || !token) return;

    const normalizedRole = role?.toLowerCase().trim();
    if (normalizedRole !== "admin") return;

    let active = true;
    fetchActiveDepartments(token).then((depts) => {
      if (active) setDepartments(depts);
    });

    return () => {
      active = false;
    };
  }, [isMounted, isAuthenticated, role, token]);

  // Load issues with filters, search, and pagination
  const loadIssues = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetchAdminIssues(token, {
        status: statusFilter,
        category: categoryFilter,
        priority: priorityFilter,
        department: departmentFilter,
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
          : "Failed to load issues across departments."
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    token,
    statusFilter,
    categoryFilter,
    priorityFilter,
    departmentFilter,
    debouncedSearch,
    page,
  ]);

  useEffect(() => {
    if (!isMounted || !isAuthenticated || !token) return;

    const normalizedRole = role?.toLowerCase().trim();
    if (normalizedRole !== "admin") return;

    let active = true;
    fetchAdminIssues(token, {
      status: statusFilter,
      category: categoryFilter,
      priority: priorityFilter,
      department: departmentFilter,
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
            : "Failed to load issues across departments."
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
    departmentFilter,
    debouncedSearch,
    page,
  ]);

  // Sorting on the fetched page
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
    departmentFilter !== "all" ||
    debouncedSearch !== "" ||
    sortBy !== "newest";

  const handleResetFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setPriorityFilter("all");
    setDepartmentFilter("all");
    setSortBy("newest");
    setPage(1);
  };

  const openModalForIssue = (
    issue: AdminIssue,
    focus: "overview" | "verify" | "assign" | "status" | "history" = "overview"
  ) => {
    setModalFocus(focus);
    setModalIssue(issue);
  };

  const handleIssueUpdated = (updatedIssue: AdminIssue, feedbackMessage: string) => {
    setSuccessMessage(feedbackMessage);
    setIssues((prev) =>
      prev.map((item) => (item._id === updatedIssue._id ? updatedIssue : item))
    );
    loadIssues();
  };

  const handleRetry = () => {
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
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-surface flex flex-col justify-between transition-transform duration-200 md:static md:translate-x-0 ${mobileSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
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
              href="/admin/departments"
              onClick={() => setMobileSidebarOpen(false)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-secondary/70 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <Building className="h-4 w-4 shrink-0 group-hover:text-accent transition-colors" />
                <span>Department Management</span>
              </div>
              {departments.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-surface-secondary text-muted group-hover:bg-accent/20 group-hover:text-accent transition-colors">
                  {departments.length}
                </span>
              )}
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
                  Citywide Issue Management
                </h1>
                <Chip color="accent" variant="soft" size="sm" className="hidden sm:inline-flex text-[10px]">
                  All Departments
                </Chip>
              </div>
              <p className="text-[10px] text-muted hidden sm:block">
                Comprehensive registry of all reported infrastructure incidents across the municipality
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
              aria-label="Refresh issues list"
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

        {/* Main Body */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1">
          {/* Header Title & View Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                All Departments Issue Registry
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Verify, triage, assign, and override issues across all municipal sectors
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex items-center rounded-xl border border-border bg-surface p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  aria-label="Table view"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${viewMode === "table"
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
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${viewMode === "grid"
                    ? "bg-accent text-accent-foreground shadow-xs"
                    : "text-muted hover:text-foreground"
                    }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Cards</span>
                </button>
              </div>

              <Link href="/admin/dashboard">
                <Button variant="outline" size="sm" className="cursor-pointer text-xs gap-1.5">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>

          {/* Success Feedback Alert */}
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

          {/* Error Feedback Alert */}
          {errorMessage && (
            <Alert className="border border-danger/40 bg-danger/10 text-danger rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 sm:mt-0" />
                <div className="text-xs">
                  <span className="font-bold block">Failed to load issues</span>
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

          {/* Search, Filter & Sort Toolbar */}
          <Card className="border border-border bg-surface p-4 rounded-2xl shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
              {/* Search input */}
              <div className="lg:col-span-3 relative">
                <Search className="h-4 w-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search title, description..."
                  aria-label="Search issues"
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

              {/* Department Filter */}
              <div className="lg:col-span-2">
                <select
                  aria-label="Filter by department"
                  value={departmentFilter}
                  onChange={(e) => {
                    setDepartmentFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full h-10 rounded-xl border border-border bg-surface-secondary/40 px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="all">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
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
              <div className="lg:col-span-1">
                <select
                  aria-label="Filter by priority"
                  value={priorityFilter}
                  onChange={(e) => {
                    setPriorityFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full h-10 rounded-xl border border-border bg-surface-secondary/40 px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
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
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <span className="text-muted">
                {isLoading
                  ? "Loading citywide incident records..."
                  : `Showing ${startRange}–${endRange} of ${totalIssues} municipal ${totalIssues === 1 ? "issue" : "issues"
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

          {/* Issues Main Area: Loading / Empty / Table / Grid */}
          {isLoading ? (
            <div className="rounded-2xl border border-border bg-surface p-14 text-center space-y-3">
              <span className="h-7 w-7 border-2 border-accent border-t-transparent rounded-full animate-spin inline-block" />
              <p className="text-xs text-muted font-medium">
                Loading citywide issues across departments...
              </p>
            </div>
          ) : sortedIssues.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-surface-secondary text-muted flex items-center justify-center mx-auto">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">
                  {hasActiveFilters ? "No Matching Incidents Found" : "No Municipal Issues Recorded"}
                </h3>
                <p className="text-xs text-muted max-w-md mx-auto">
                  {hasActiveFilters
                    ? "No incidents matched your chosen search or filter criteria. Try adjusting or clearing filters."
                    : "No civic incident reports currently exist in the database."}
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
                      <th className="py-3.5 px-4">Title & ID</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Department</th>
                      <th className="py-3.5 px-4">Priority</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Reporter</th>
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

                      return (
                        <tr
                          key={item._id}
                          className="hover:bg-surface-secondary/40 transition-colors"
                        >
                          <td className="py-3.5 px-4 max-w-[220px]">
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

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {item.department ? (
                              <div>
                                <span className="font-medium text-foreground block">
                                  {item.department.name}
                                </span>
                                <span className="font-mono text-[10px] text-muted uppercase">
                                  {item.department.code}
                                </span>
                              </div>
                            ) : (
                              <span className="text-warning text-[11px] font-medium">Unassigned</span>
                            )}
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
                            <div className="text-foreground font-medium">
                              {item.reportedBy?.name || "Citizen"}
                            </div>
                            {item.reportedBy?.email && (
                              <div className="text-[10px] text-muted truncate max-w-[140px]">
                                {item.reportedBy.email}
                              </div>
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
                                aria-label="View details and audit trail"
                                onPress={() => openModalForIssue(item, "overview")}
                                className="cursor-pointer h-7 w-7 text-muted hover:text-accent"
                              >
                                <Eye className="h-3.5 w-3.5" />
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
                    : "No location address provided");

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
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <CategoryBadgeIcon
                              category={item.category}
                              className="h-3.5 w-3.5 text-accent shrink-0"
                            />
                            <span className="font-medium text-foreground">{item.category}</span>
                          </div>
                          <span className="font-medium text-foreground bg-surface-secondary px-2 py-0.5 rounded-md">
                            {item.department ? item.department.code : "Unassigned"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{locationText}</span>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            {formattedDate}
                          </span>
                          <span className="flex items-center gap-1 truncate max-w-[140px]">
                            <User className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{item.reportedBy?.name || "Citizen"}</span>
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
                        Details
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

      {/* Admin Issue Details & Actions Modal */}
      {token && modalIssue && (
        <AdminIssueModal
          key={`${modalIssue._id}-${modalFocus}`}
          issue={modalIssue}
          token={token}
          departments={departments}
          initialFocusAction={modalFocus}
          onClose={() => setModalIssue(null)}
          onIssueUpdated={handleIssueUpdated}
        />
      )}
    </div>
  );
}
