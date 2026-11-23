"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Chip, Alert } from "@heroui/react";
import {
  Activity,
  AlertCircle,
  ArrowUpDown,
  Building,
  Calendar,
  ChevronLeft,
  ChevronRight,
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
  LogOut,
  MapPin,
  Menu,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { getDashboardPath } from "@/lib/auth";
import {
  CitizenIssue,
  fetchMyReports,
  getStatusMeta,
  getPriorityMeta,
} from "@/lib/citizen-api";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { IssueDetailsModal } from "@/components/citizen/issue-details-modal";

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

function CategoryBadgeIcon({ category, className }: { category?: string; className?: string }) {
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

export default function MyReportsPage() {
  const router = useRouter();
  const { user, token, role, isAuthenticated, isMounted, logout } = useAuth();

  // Mobile sidebar state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Filter & Search states
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Pagination states
  const [page, setPage] = useState(1);
  const limit = 10;
  const [totalPages, setTotalPages] = useState(1);
  const [totalReports, setTotalReports] = useState(0);

  // View presentation state (list vs grid)
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Data & loading states
  const [issues, setIssues] = useState<CitizenIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick-view modal state
  const [selectedIssue, setSelectedIssue] = useState<CitizenIssue | null>(null);

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

  // Debounce search input (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1); // Reset to page 1 on new search
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch reports from backend API within effect
  useEffect(() => {
    if (!token || !isAuthenticated || role !== "citizen") return;

    let isSubscribed = true;
    const currentToken = token;

    async function loadReportsData() {
      try {
        const filters = {
          status: statusFilter,
          priority: priorityFilter,
          category: categoryFilter,
          search: debouncedSearch,
          page,
          limit,
        };

        const res = await fetchMyReports(currentToken, filters);
        if (!isSubscribed) return;

        let fetchedIssues = res.issues || [];

        // If category filter is applied and backend's getMyReports does not filter category server-side,
        // apply client-side guarantee
        if (categoryFilter && categoryFilter !== "all") {
          fetchedIssues = fetchedIssues.filter(
            (item) => item.category?.toLowerCase() === categoryFilter.toLowerCase()
          );
        }

        // Client-side sorting on the loaded page
        const sorted = [...fetchedIssues].sort((a, b) => {
          if (sortBy === "newest") {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
          if (sortBy === "oldest") {
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          }
          if (sortBy === "title_asc") {
            return a.title.localeCompare(b.title);
          }
          if (sortBy === "priority_desc" || sortBy === "priority_asc") {
            const weights: { [key: string]: number } = {
              urgent: 4,
              high: 3,
              medium: 2,
              low: 1,
            };
            const wA = weights[a.priority?.toLowerCase()] || 0;
            const wB = weights[b.priority?.toLowerCase()] || 0;
            return sortBy === "priority_desc" ? wB - wA : wA - wB;
          }
          return 0;
        });

        setIssues(sorted);
        setTotalReports(res.total || sorted.length);
        setTotalPages(Math.max(1, res.totalPages || Math.ceil((res.total || sorted.length) / limit)));
        setErrorMessage(null);
      } catch (err: unknown) {
        if (!isSubscribed) return;
        if (err instanceof Error) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage("Failed to load reports. Please check your connection.");
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    loadReportsData();

    return () => {
      isSubscribed = false;
    };
  }, [token, isAuthenticated, role, debouncedSearch, statusFilter, priorityFilter, categoryFilter, page, limit, sortBy]);

  // Manual refresh callback
  const handleManualRefresh = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const filters = {
        status: statusFilter,
        priority: priorityFilter,
        category: categoryFilter,
        search: debouncedSearch,
        page,
        limit,
      };
      const res = await fetchMyReports(token, filters);
      let fetchedIssues = res.issues || [];
      if (categoryFilter && categoryFilter !== "all") {
        fetchedIssues = fetchedIssues.filter(
          (item) => item.category?.toLowerCase() === categoryFilter.toLowerCase()
        );
      }
      setIssues(fetchedIssues);
      setTotalReports(res.total || fetchedIssues.length);
      setTotalPages(Math.max(1, res.totalPages || Math.ceil((res.total || fetchedIssues.length) / limit)));
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to load reports. Please check your connection.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, statusFilter, priorityFilter, categoryFilter, debouncedSearch, page, limit]);

  // Reset all active filters
  const handleResetFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setCategoryFilter("all");
    setSortBy("newest");
    setPage(1);
  };

  const hasActiveFilters =
    searchInput.trim() !== "" ||
    statusFilter !== "all" ||
    priorityFilter !== "all" ||
    categoryFilter !== "all";

  // Loading skeleton screen when auth is initializing
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
                  Citizen Portal
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
              href="/citizen/dashboard"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-secondary/70 transition-all cursor-pointer"
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              <span>Overview</span>
            </Link>

            <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold bg-accent text-accent-foreground shadow-xs cursor-default">
              <FileSpreadsheet className="h-4 w-4 shrink-0" />
              <span>My Reports</span>
              {totalReports > 0 && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-white/20 text-white">
                  {totalReports}
                </span>
              )}
            </div>

            <Link
              href="/citizen/report-issue"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-secondary/70 transition-all cursor-pointer"
            >
              <PlusCircle className="h-4 w-4 shrink-0" />
              <span>Report an Issue</span>
            </Link>
          </nav>
        </div>

        {/* User Card & Logout in Sidebar Footer */}
        <div className="p-4 border-t border-border space-y-3">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-surface-secondary/50">
            <div className="h-9 w-9 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-bold text-xs">
              {user?.name?.slice(0, 2).toUpperCase() || "CZ"}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-foreground truncate">
                {user?.name || "Citizen"}
              </span>
              <span className="text-[10px] text-muted truncate">
                {user?.email || "citizen@civicpulse.org"}
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onPress={logout}
            className="w-full justify-start text-xs font-medium text-danger hover:bg-danger/10 cursor-pointer"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* =========================================================================
          2. Main Application Area
          ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-16 border-b border-border bg-surface/85 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              isIconOnly
              size="sm"
              onPress={() => setMobileSidebarOpen(true)}
              aria-label="Open navigation menu"
              className="md:hidden cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-accent" />
              <h1 className="text-sm sm:text-base font-bold text-foreground">
                My Reported Issues
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onPress={() => handleManualRefresh()}
              isDisabled={isLoading}
              className="cursor-pointer text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            <Link
              href="/citizen/report-issue"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-accent-foreground text-xs font-semibold shadow-xs hover:bg-accent/90 transition-all"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Report Issue</span>
            </Link>

            <div className="h-4 w-px bg-border mx-1" />
            <ThemeToggle />
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Header Title & Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                Incident Reports Archive
              </h2>
              <p className="text-xs sm:text-sm text-muted">
                Track status progression, departmental assignments, and municipal resolution details for your reports.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="flex items-center border border-border bg-surface rounded-xl p-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  aria-label="Table view"
                  className={`p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    viewMode === "table"
                      ? "bg-accent text-accent-foreground shadow-xs"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <LayoutList className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                  className={`p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-accent text-accent-foreground shadow-xs"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* =========================================================================
              3. SEARCH & FILTERS TOOLBAR
              ========================================================================= */}
          <Card className="border border-border bg-surface shadow-xs rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              {/* Debounced Search Bar */}
              <div className="md:col-span-5 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by title, keywords, or description..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-border bg-surface-secondary/40 text-foreground placeholder:text-muted/60 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      setDebouncedSearch("");
                    }}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <div className="md:col-span-3">
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface-secondary/40 text-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all cursor-pointer"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="md:col-span-2">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface-secondary/40 text-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all cursor-pointer"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority Filter */}
              <div className="md:col-span-2">
                <select
                  value={priorityFilter}
                  onChange={(e) => {
                    setPriorityFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface-secondary/40 text-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all cursor-pointer"
                >
                  {PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bottom Row: Sorting, Active Filters & Reset */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/70 text-xs">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted" />
                <span className="text-muted font-medium">Sort By:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-border bg-surface text-foreground text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
                >
                  {SORT_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={handleResetFilters}
                    className="text-xs text-muted hover:text-foreground cursor-pointer h-7 px-2.5"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset Filters
                  </Button>
                )}

                <span className="text-muted font-mono">
                  Total: <strong className="text-foreground">{totalReports}</strong> {totalReports === 1 ? "report" : "reports"}
                </span>
              </div>
            </div>
          </Card>

          {/* =========================================================================
              4. ERROR STATE BANNER
              ========================================================================= */}
          {errorMessage && (
            <Alert className="rounded-xl border border-danger/40 bg-danger/10 text-danger p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-xs">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <div>
                  <span className="font-bold">Error loading reports: </span>
                  <span>{errorMessage}</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onPress={() => handleManualRefresh()}
                className="cursor-pointer text-xs shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Retry
              </Button>
            </Alert>
          )}

          {/* =========================================================================
              5. CONTENT LISTING / CARDS / EMPTY / LOADING
              ========================================================================= */}
          {isLoading ? (
            /* Skeleton Loading Cards */
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className="h-24 rounded-2xl border border-border/80 bg-surface/50 animate-pulse p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-14 w-14 rounded-xl bg-surface-secondary/80 shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-1/3 rounded bg-surface-secondary/80" />
                      <div className="h-3 w-1/2 rounded bg-surface-secondary/60" />
                    </div>
                  </div>
                  <div className="h-6 w-20 rounded bg-surface-secondary/80" />
                </div>
              ))}
            </div>
          ) : issues.length === 0 ? (
            /* Empty State */
            <Card className="border border-border bg-surface rounded-2xl p-10 sm:p-14 text-center space-y-4 shadow-xs">
              <div className="h-16 w-16 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mx-auto">
                <FileSpreadsheet className="h-8 w-8" />
              </div>

              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-lg font-bold text-foreground">
                  {hasActiveFilters ? "No matching reports found" : "No Reports Submitted Yet"}
                </h3>
                <p className="text-xs sm:text-sm text-muted">
                  {hasActiveFilters
                    ? "Try adjusting your search query, status, priority, or category filters to find reports."
                    : "You haven't filed any municipal infrastructure reports yet. Help keep your city functional and safe."}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                {hasActiveFilters ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={handleResetFilters}
                    className="font-semibold cursor-pointer text-xs"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Clear All Filters
                  </Button>
                ) : (
                  <Link
                    href="/citizen/report-issue"
                    className="px-4 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-semibold shadow-xs hover:bg-accent/90 transition-all inline-flex items-center gap-2"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Report Your First Issue
                  </Link>
                )}
              </div>
            </Card>
          ) : viewMode === "table" ? (
            /* =====================================================================
                5A. TABLE VIEW (Responsive cards on mobile, clean rows on desktop)
                ===================================================================== */
            <div className="border border-border bg-surface rounded-2xl overflow-hidden shadow-xs divide-y divide-border/70">
              {/* Desktop Header */}
              <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-3.5 bg-surface-secondary/40 text-[11px] font-bold uppercase tracking-wider text-muted">
                <div className="col-span-5">Incident / Category</div>
                <div className="col-span-2">Department</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1">Priority</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {/* Rows */}
              {issues.map((issue) => {
                const statusMeta = getStatusMeta(issue.status);
                const priorityMeta = getPriorityMeta(issue.priority);
                const hasImage = issue.images && issue.images.length > 0;
                const formattedDate = new Date(issue.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={issue._id}
                    className="p-4 sm:p-5 lg:px-6 lg:py-4 flex flex-col lg:grid lg:grid-cols-12 lg:items-center gap-3 hover:bg-surface-secondary/20 transition-colors"
                  >
                    {/* Column 1: Thumbnail & Title & Date */}
                    <div className="col-span-5 flex items-start gap-3.5 min-w-0">
                      {/* Image Thumbnail */}
                      <div className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-xl overflow-hidden border border-border bg-surface-secondary/50 shrink-0 flex items-center justify-center">
                        {hasImage ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={issue.images![0]}
                              alt={issue.title}
                              className="h-full w-full object-cover"
                            />
                            {issue.images!.length > 1 && (
                              <span className="absolute bottom-1 right-1 bg-black/70 text-white rounded px-1 text-[9px] font-mono">
                                +{issue.images!.length - 1}
                              </span>
                            )}
                          </>
                        ) : (
                          <CategoryBadgeIcon category={issue.category} className="h-6 w-6 text-muted/60" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-accent">
                            #{issue._id.slice(-6).toUpperCase()}
                          </span>
                          <span className="text-[11px] font-semibold text-muted flex items-center gap-1">
                            <CategoryBadgeIcon category={issue.category} className="h-3 w-3 text-accent" />
                            {issue.category}
                          </span>
                        </div>

                        <Link
                          href={`/citizen/my-reports/${issue._id}`}
                          className="font-bold text-sm text-foreground hover:text-accent transition-colors block truncate"
                        >
                          {issue.title}
                        </Link>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formattedDate}
                          </span>
                          {issue.location?.address && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[200px] flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-accent shrink-0" />
                                {issue.location.address}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Department */}
                    <div className="col-span-2 text-xs flex items-center gap-1.5 text-foreground">
                      <Building className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span className="truncate">
                        {issue.department?.name || "Pending Triage"}
                      </span>
                    </div>

                    {/* Column 3: Status Badge */}
                    <div className="col-span-2 flex items-center gap-2">
                      <Chip color={statusMeta.color} variant="soft" size="sm">
                        {statusMeta.label}
                      </Chip>
                    </div>

                    {/* Column 4: Priority */}
                    <div className="col-span-1">
                      <Chip color={priorityMeta.color} variant="secondary" size="sm">
                        {priorityMeta.label}
                      </Chip>
                    </div>

                    {/* Column 5: Actions */}
                    <div className="col-span-2 flex items-center justify-end gap-2 pt-2 lg:pt-0 border-t border-border/50 lg:border-t-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onPress={() => setSelectedIssue(issue)}
                        className="text-xs font-semibold cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Quick View
                      </Button>

                      <Link
                        href={`/citizen/my-reports/${issue._id}`}
                        className="p-1.5 rounded-lg border border-border text-muted hover:text-accent hover:bg-surface-secondary/70 transition-all"
                        aria-label="Open report page"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* =====================================================================
                5B. GRID VIEW (Modern Cards)
                ===================================================================== */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {issues.map((issue) => {
                const statusMeta = getStatusMeta(issue.status);
                const priorityMeta = getPriorityMeta(issue.priority);
                const hasImage = issue.images && issue.images.length > 0;
                const formattedDate = new Date(issue.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });

                return (
                  <Card
                    key={issue._id}
                    className="border border-border bg-surface rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between hover:border-accent/40 transition-all group"
                  >
                    <div>
                      {/* Card Image Banner */}
                      <div className="relative h-36 w-full bg-surface-secondary/60 flex items-center justify-center overflow-hidden border-b border-border/60">
                        {hasImage ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={issue.images![0]}
                              alt={issue.title}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {issue.images!.length > 1 && (
                              <span className="absolute bottom-2 right-2 bg-black/70 text-white rounded px-1.5 py-0.5 text-[10px] font-mono">
                                +{issue.images!.length - 1} photos
                              </span>
                            )}
                          </>
                        ) : (
                          <div className="flex flex-col items-center gap-1.5 text-muted/60">
                            <CategoryBadgeIcon category={issue.category} className="h-10 w-10 stroke-1" />
                            <span className="text-[10px] font-semibold uppercase tracking-wider">
                              No Evidence Attached
                            </span>
                          </div>
                        )}

                        {/* Top Badges */}
                        <div className="absolute top-2 left-2 flex items-center gap-1.5">
                          <Chip color={statusMeta.color} variant="soft" size="sm">
                            {statusMeta.label}
                          </Chip>
                        </div>

                        <div className="absolute top-2 right-2">
                          <Chip color={priorityMeta.color} variant="secondary" size="sm">
                            {priorityMeta.label}
                          </Chip>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 space-y-2.5">
                        <div className="flex items-center justify-between text-[11px] text-muted">
                          <span className="font-mono font-bold text-accent">
                            #{issue._id.slice(-6).toUpperCase()}
                          </span>
                          <span className="flex items-center gap-1">
                            <CategoryBadgeIcon category={issue.category} className="h-3 w-3 text-accent" />
                            {issue.category}
                          </span>
                        </div>

                        <Link
                          href={`/citizen/my-reports/${issue._id}`}
                          className="font-bold text-sm text-foreground hover:text-accent transition-colors line-clamp-2 block"
                        >
                          {issue.title}
                        </Link>

                        <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                          {issue.description}
                        </p>

                        <div className="pt-2 border-t border-border/70 space-y-1.5 text-[11px] text-muted">
                          <div className="flex items-center gap-1.5 truncate">
                            <Building className="h-3.5 w-3.5 text-accent shrink-0" />
                            <span className="truncate">
                              {issue.department?.name || "Pending Triage"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formattedDate}
                            </span>
                            {issue.location?.address && (
                              <span className="truncate max-w-[130px] flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-accent shrink-0" />
                                {issue.location.address}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="p-4 pt-0 flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onPress={() => setSelectedIssue(issue)}
                        className="flex-1 text-xs font-semibold cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Quick View
                      </Button>

                      <Link
                        href={`/citizen/my-reports/${issue._id}`}
                        className="px-3 py-1.5 rounded-xl bg-accent text-accent-foreground text-xs font-semibold shadow-xs hover:bg-accent/90 transition-all flex items-center gap-1"
                      >
                        Details
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* =========================================================================
              6. PAGINATION CONTROLS
              ========================================================================= */}
          {totalReports > 0 && (
            <div className="border border-border bg-surface rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-muted">
                Showing <strong className="text-foreground">{(page - 1) * limit + 1}</strong> to{" "}
                <strong className="text-foreground">
                  {Math.min(page * limit, totalReports)}
                </strong>{" "}
                of <strong className="text-foreground">{totalReports}</strong> reports
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  isDisabled={page <= 1 || isLoading}
                  aria-label="Previous page"
                  className="cursor-pointer text-xs h-8"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>

                <span className="px-3 py-1 rounded-lg border border-border bg-surface-secondary/40 font-mono font-bold text-foreground">
                  {page} / {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                  isDisabled={page >= totalPages || isLoading}
                  aria-label="Next page"
                  className="cursor-pointer text-xs h-8"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* =========================================================================
          7. QUICK INSPECTION MODAL
          ========================================================================= */}
      {selectedIssue && (
        <IssueDetailsModal
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
        />
      )}
    </div>
  );
}
