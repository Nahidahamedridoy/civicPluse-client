"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Chip } from "@heroui/react";
import {
  Activity,
  AlertCircle,
  Building,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit2,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  LayoutDashboard,
  LineChart,
  Loader2,
  LogOut,
  Menu,
  Plus,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { getDashboardPath } from "@/lib/auth";
import {
  AdminDepartment,
  AdminUserRecord,
  DepartmentPerformanceItem,
  deleteDepartmentByAdmin,
  fetchAdminDepartmentPerformance,
  fetchAdminDepartments,
  fetchAdminUsers,
} from "@/lib/admin-api";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { DepartmentModal } from "@/components/admin/department-modal";
import { DepartmentDetailsModal } from "@/components/admin/department-details-modal";

export default function AdminDepartmentsPage() {
  const router = useRouter();
  const { user, token, role, isAuthenticated, isMounted, logout } = useAuth();

  // Mobile sidebar drawer state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Department data states
  const [departments, setDepartments] = useState<AdminDepartment[]>([]);
  const [departmentPerformance, setDepartmentPerformance] = useState<
    DepartmentPerformanceItem[]
  >([]);
  const [managers, setManagers] = useState<AdminUserRecord[]>([]);
  const [staffCounts, setStaffCounts] = useState<Record<string, number>>({});

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const limit = 8;
  const [totalPages, setTotalPages] = useState(1);
  const [totalDepartments, setTotalDepartments] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all"
  );

  // Loading & error/feedback states
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] =
    useState<AdminDepartment | null>(null);
  const [detailsDepartment, setDetailsDepartment] =
    useState<AdminDepartment | null>(null);
  const [deletingDepartment, setDeletingDepartment] =
    useState<AdminDepartment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load department data & stats concurrently
  const loadDepartments = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const activeParam =
        statusFilter === "all" ? undefined : statusFilter === "active";

      const [deptRes, perfRes, managersRes, staffRes] = await Promise.all([
        fetchAdminDepartments(token, {
          page,
          limit,
          search: debouncedSearch,
          isActive: activeParam,
        }),
        fetchAdminDepartmentPerformance(token),
        fetchAdminUsers(token, { role: "department_manager" }),
        fetchAdminUsers(token, { role: "maintenance_staff", limit: 100 }),
      ]);

      setDepartments(deptRes.departments);
      setTotalPages(deptRes.totalPages);
      setTotalDepartments(deptRes.total);
      setDepartmentPerformance(perfRes);
      setManagers(managersRes.users);

      // Compute staff counts per department
      const counts: Record<string, number> = {};
      staffRes.users.forEach((st) => {
        if (st.department?._id) {
          counts[st.department._id] = (counts[st.department._id] || 0) + 1;
        }
      });
      setStaffCounts(counts);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to load municipal departments."
      );
    } finally {
      setIsLoading(false);
    }
  }, [token, page, limit, debouncedSearch, statusFilter]);

  useEffect(() => {
    if (!isMounted || !isAuthenticated || !token) return;
    const normalizedRole = role?.toLowerCase().trim();
    if (normalizedRole !== "admin") return;

    let active = true;
    const activeParam =
      statusFilter === "all" ? undefined : statusFilter === "active";

    Promise.all([
      fetchAdminDepartments(token, {
        page,
        limit,
        search: debouncedSearch,
        isActive: activeParam,
      }),
      fetchAdminDepartmentPerformance(token),
      fetchAdminUsers(token, { role: "department_manager" }),
      fetchAdminUsers(token, { role: "maintenance_staff", limit: 100 }),
    ])
      .then(([deptRes, perfRes, managersRes, staffRes]) => {
        if (!active) return;
        setDepartments(deptRes.departments);
        setTotalPages(deptRes.totalPages);
        setTotalDepartments(deptRes.total);
        setDepartmentPerformance(perfRes);
        setManagers(managersRes.users);

        const counts: Record<string, number> = {};
        staffRes.users.forEach((st) => {
          if (st.department?._id) {
            counts[st.department._id] = (counts[st.department._id] || 0) + 1;
          }
        });
        setStaffCounts(counts);
        setErrorMessage(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Failed to load municipal departments."
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isMounted, isAuthenticated, role, token, page, limit, debouncedSearch, statusFilter]);

  // Delete / Deactivate action
  const handleDeleteDepartment = async () => {
    if (!token || !deletingDepartment) return;

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const res = await deleteDepartmentByAdmin(token, deletingDepartment._id);
      setSuccessMessage(res.message);
      setDeletingDepartment(null);
      loadDepartments();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to delete department."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper map for performance metrics
  const perfMap = new Map<string, DepartmentPerformanceItem>();
  departmentPerformance.forEach((p) => {
    if (p.departmentId) perfMap.set(p.departmentId, p);
  });

  // Helper map for managers
  const managerMap = new Map<string, AdminUserRecord>();
  managers.forEach((m) => {
    if (m.department?._id) managerMap.set(m.department._id, m);
  });

  const activeCount = departments.filter((d) => d.isActive).length;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row transition-colors">
      {/* Mobile sidebar backdrop */}
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
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold bg-accent text-accent-foreground shadow-xs transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Building className="h-4 w-4 shrink-0" />
                <span>Department Management</span>
              </div>
              {totalDepartments > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-white/20 text-white">
                  {totalDepartments}
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
                  Department Administration
                </h1>
                <Chip color="accent" variant="soft" size="sm" className="hidden sm:inline-flex text-[10px]">
                  Divisions & Workload
                </Chip>
              </div>
              <p className="text-[10px] text-muted hidden sm:block">
                Municipal department catalog, leadership assignments, and operational capacity
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="primary"
              size="sm"
              onPress={() => setIsCreateModalOpen(true)}
              className="cursor-pointer text-xs font-semibold gap-1.5 shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" /> New Department
            </Button>

            <Button
              variant="ghost"
              isIconOnly
              size="sm"
              onPress={loadDepartments}
              isDisabled={isLoading}
              aria-label="Refresh departments"
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
          {/* Notifications / Alerts */}
          {errorMessage && (
            <Alert className="border border-danger/40 bg-danger/10 text-danger rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onPress={loadDepartments}
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

          {/* Quick Stats Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="border border-border bg-surface p-4 rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  Total Divisions
                </span>
                <Building className="h-4 w-4 text-accent" />
              </div>
              <div className="text-2xl font-black text-foreground">
                {isLoading ? "--" : totalDepartments}
              </div>
              <span className="text-[10px] text-muted">Configured in registry</span>
            </Card>

            <Card className="border border-border bg-surface p-4 rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-success">
                  Active Divisions
                </span>
                <Power className="h-4 w-4 text-success" />
              </div>
              <div className="text-2xl font-black text-foreground">
                {isLoading ? "--" : activeCount}
              </div>
              <span className="text-[10px] text-muted">Receiving reports</span>
            </Card>

            <Card className="border border-border bg-surface p-4 rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                  Assigned Managers
                </span>
                <UserCheck className="h-4 w-4 text-accent" />
              </div>
              <div className="text-2xl font-black text-foreground">
                {isLoading ? "--" : managers.filter((m) => m.department).length}
              </div>
              <span className="text-[10px] text-muted">Leadership active</span>
            </Card>

            <Card className="border border-border bg-surface p-4 rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-warning">
                  Field Technicians
                </span>
                <Wrench className="h-4 w-4 text-warning" />
              </div>
              <div className="text-2xl font-black text-foreground">
                {isLoading
                  ? "--"
                  : Object.values(staffCounts).reduce((a, b) => a + b, 0)}
              </div>
              <span className="text-[10px] text-muted">Maintenance crew</span>
            </Card>
          </div>

          {/* Filter & Search Bar */}
          <div className="p-4 rounded-2xl border border-border bg-surface shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search departments by name or division code..."
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

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted text-[11px] font-semibold hidden sm:inline">
                  Status:
                </span>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as "all" | "active" | "inactive");
                    setPage(1);
                  }}
                  className="px-3 py-2 rounded-xl border border-border bg-surface text-foreground text-xs focus:outline-hidden focus:border-accent"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>

              {(searchInput || statusFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => {
                    setSearchInput("");
                    setStatusFilter("all");
                    setPage(1);
                  }}
                  className="text-xs text-muted hover:text-foreground cursor-pointer"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Department List Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <Card
                  key={idx}
                  className="border border-border bg-surface p-5 rounded-2xl shadow-xs space-y-4 animate-pulse"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-9 w-9 rounded-xl bg-surface-secondary" />
                    <div className="h-5 w-16 rounded-full bg-surface-secondary" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-3/4 rounded bg-surface-secondary" />
                    <div className="h-3 w-1/2 rounded bg-surface-secondary" />
                  </div>
                  <div className="h-10 rounded bg-surface-secondary/50" />
                </Card>
              ))}
            </div>
          ) : departments.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-surface space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-surface-secondary text-muted flex items-center justify-center mx-auto">
                <Building className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-foreground">
                  No Departments Found
                </h4>
                <p className="text-xs text-muted max-w-sm mx-auto">
                  {debouncedSearch || statusFilter !== "all"
                    ? "No departments match the specified search query or filter."
                    : "No municipal departments have been registered yet."}
                </p>
              </div>
              {debouncedSearch || statusFilter !== "all" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => {
                    setSearchInput("");
                    setStatusFilter("all");
                  }}
                  className="cursor-pointer text-xs"
                >
                  Clear Filters
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onPress={() => setIsCreateModalOpen(true)}
                  className="cursor-pointer text-xs font-semibold gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> Create First Department
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {departments.map((dept) => {
                const perf = perfMap.get(dept._id);
                const manager = managerMap.get(dept._id);
                const staffCount = staffCounts[dept._id] || 0;

                return (
                  <Card
                    key={dept._id}
                    className="border border-border bg-surface hover:border-accent/40 p-5 rounded-2xl shadow-xs transition-all space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Top Header: Code badge, Status Chip & Quick Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-xl bg-accent/15 text-accent uppercase tracking-wider">
                            {dept.code}
                          </span>
                          <Chip
                            color={dept.isActive ? "success" : "danger"}
                            variant="soft"
                            size="sm"
                            className="text-[10px]"
                          >
                            {dept.isActive ? "Active" : "Inactive"}
                          </Chip>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            isIconOnly
                            size="sm"
                            onPress={() => setEditingDepartment(dept)}
                            aria-label={`Edit ${dept.name}`}
                            className="cursor-pointer text-muted hover:text-accent"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>

                          {dept.isActive && (
                            <Button
                              variant="ghost"
                              isIconOnly
                              size="sm"
                              onPress={() => setDeletingDepartment(dept)}
                              aria-label={`Deactivate ${dept.name}`}
                              className="cursor-pointer text-muted hover:text-danger"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h3 className="text-base font-bold text-foreground">
                          {dept.name}
                        </h3>
                        <p className="text-xs text-muted mt-1 line-clamp-2 leading-relaxed">
                          {dept.description || "No official description recorded."}
                        </p>
                      </div>

                      {/* Manager Section */}
                      <div className="p-3 rounded-xl border border-border bg-surface-secondary/30 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-7 w-7 rounded-lg bg-surface-secondary text-muted font-bold flex items-center justify-center text-[11px] shrink-0">
                            {manager ? manager.name.charAt(0).toUpperCase() : "?"}
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] text-muted block uppercase font-semibold">
                              Department Manager
                            </span>
                            <span className="font-semibold text-foreground truncate block">
                              {manager ? manager.name : "Unassigned"}
                            </span>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onPress={() => setDetailsDepartment(dept)}
                          className="cursor-pointer text-[11px] text-accent font-semibold shrink-0"
                        >
                          {manager ? "Change" : "Assign"}
                        </Button>
                      </div>

                      {/* Operational Statistics */}
                      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                        <div className="p-2.5 rounded-xl border border-border/70 bg-surface-secondary/20">
                          <span className="text-[10px] text-muted block uppercase">
                            Staff
                          </span>
                          <span className="text-sm font-bold text-foreground">
                            {staffCount}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl border border-border/70 bg-surface-secondary/20">
                          <span className="text-[10px] text-muted block uppercase">
                            Total Issues
                          </span>
                          <span className="text-sm font-bold text-foreground">
                            {perf?.totalIssues ?? 0}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl border border-border/70 bg-surface-secondary/20">
                          <span className="text-[10px] text-muted block uppercase">
                            Resolved
                          </span>
                          <span className="text-sm font-bold text-success">
                            {perf?.resolvedIssues ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: View Details CTA */}
                    <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
                      <span className="text-[10px] text-muted font-mono">
                        #{dept._id.slice(-6).toUpperCase()}
                      </span>

                      <Button
                        variant="outline"
                        size="sm"
                        onPress={() => setDetailsDepartment(dept)}
                        className="cursor-pointer text-xs font-semibold gap-1.5"
                      >
                        <Eye className="h-3.5 w-3.5 text-accent" /> View Details
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 rounded-2xl border border-border bg-surface flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-muted">
                Showing page <strong className="text-foreground">{page}</strong> of{" "}
                <strong className="text-foreground">{totalPages}</strong> ({totalDepartments} total divisions)
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  isDisabled={page <= 1 || isLoading}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  className="cursor-pointer text-xs gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  isDisabled={page >= totalPages || isLoading}
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="cursor-pointer text-xs gap-1"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODALS */}
      {/* 1. Create Department Modal */}
      <DepartmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        token={token || ""}
        onSuccess={(_, msg) => {
          setSuccessMessage(msg);
          loadDepartments();
        }}
      />

      {/* 2. Edit Department Modal */}
      <DepartmentModal
        isOpen={Boolean(editingDepartment)}
        department={editingDepartment}
        onClose={() => setEditingDepartment(null)}
        token={token || ""}
        onSuccess={(_, msg) => {
          setSuccessMessage(msg);
          loadDepartments();
        }}
      />

      {/* 3. Details & Manager Assignment Modal */}
      <DepartmentDetailsModal
        isOpen={Boolean(detailsDepartment)}
        department={detailsDepartment}
        onClose={() => setDetailsDepartment(null)}
        token={token || ""}
        onManagerAssigned={() => {
          loadDepartments();
        }}
      />

      {/* 4. Delete / Deactivation Confirmation Dialog */}
      {deletingDepartment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setDeletingDepartment(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-surface text-foreground shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-danger">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger/15 text-danger">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-foreground">
                  Deactivate Department?
                </h4>
                <p className="text-xs text-muted">
                  Division #{deletingDepartment.code}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Are you sure you want to deactivate{" "}
              <strong className="text-foreground">{deletingDepartment.name}</strong>?
              Deactivated departments will no longer accept new issue assignments or reports.
            </p>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onPress={() => setDeletingDepartment(null)}
                isDisabled={isDeleting}
                className="cursor-pointer text-xs"
              >
                Cancel
              </Button>

              <Button
                variant="danger"
                size="sm"
                onPress={handleDeleteDepartment}
                isDisabled={isDeleting}
                className="cursor-pointer text-xs font-semibold gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Deactivating...
                  </>
                ) : (
                  <>
                    <Power className="h-3.5 w-3.5" /> Confirm Deactivation
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
