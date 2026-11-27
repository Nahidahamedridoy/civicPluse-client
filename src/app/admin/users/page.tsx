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
  ExternalLink,
  FileSpreadsheet,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCheck,
  UserCog,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { getDashboardPath } from "@/lib/auth";
import {
  AdminUserRecord,
  DepartmentOption,
  fetchActiveDepartments,
  fetchAdminUsers,
} from "@/lib/admin-api";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserActionModal } from "@/components/admin/user-action-modal";

const ROLE_OPTIONS = [
  { value: "all", label: "All Roles" },
  { value: "citizen", label: "Citizens" },
  { value: "maintenance_staff", label: "Maintenance Crew" },
  { value: "department_manager", label: "Department Managers" },
  { value: "admin", label: "Administrators" },
];

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, token, role, isAuthenticated, isMounted, logout } = useAuth();

  // Mobile drawer state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // User list and department data
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);

  // Pagination & filter states
  const [page, setPage] = useState(1);
  const limit = 10;
  const [totalPages, setTotalPages] = useState(1);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Loading & error/success messages
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Action modal state
  const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(null);

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

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load active departments for filter dropdown
  useEffect(() => {
    if (!token) return;
    fetchActiveDepartments(token)
      .then((data) => setDepartments(data))
      .catch(() => setDepartments([]));
  }, [token]);

  // Load user data
  const loadUsers = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const activeParam =
        statusFilter === "all" ? undefined : statusFilter === "active";

      const res = await fetchAdminUsers(token, {
        page,
        limit,
        search: debouncedSearch,
        role: roleFilter,
        department: departmentFilter,
        isActive: activeParam,
      });

      setUsers(res.users);
      setTotalUsers(res.total);
      setTotalPages(res.totalPages);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load system users."
      );
    } finally {
      setIsLoading(false);
    }
  }, [token, page, limit, debouncedSearch, roleFilter, departmentFilter, statusFilter]);

  useEffect(() => {
    if (!isMounted || !isAuthenticated || !token) return;
    const normalizedRole = role?.toLowerCase().trim();
    if (normalizedRole !== "admin") return;

    let active = true;
    const activeParam =
      statusFilter === "all" ? undefined : statusFilter === "active";

    fetchAdminUsers(token, {
      page,
      limit,
      search: debouncedSearch,
      role: roleFilter,
      department: departmentFilter,
      isActive: activeParam,
    })
      .then((res) => {
        if (!active) return;
        setUsers(res.users);
        setTotalUsers(res.total);
        setTotalPages(res.totalPages);
        setErrorMessage(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to load system users."
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
    roleFilter,
    departmentFilter,
    statusFilter,
  ]);

  const renderRoleBadge = (r: string) => {
    switch (r) {
      case "admin":
        return (
          <Chip color="danger" variant="soft" size="sm" className="font-semibold text-[10px]">
            <ShieldAlert className="h-3 w-3 mr-1 inline" /> Admin
          </Chip>
        );
      case "department_manager":
        return (
          <Chip color="accent" variant="soft" size="sm" className="font-semibold text-[10px]">
            <ShieldCheck className="h-3 w-3 mr-1 inline" /> Manager
          </Chip>
        );
      case "maintenance_staff":
        return (
          <Chip color="warning" variant="soft" size="sm" className="font-semibold text-[10px]">
            <Wrench className="h-3 w-3 mr-1 inline" /> Staff
          </Chip>
        );
      case "citizen":
      default:
        return (
          <Chip color="default" variant="soft" size="sm" className="font-semibold text-[10px]">
            <User className="h-3 w-3 mr-1 inline" /> Citizen
          </Chip>
        );
    }
  };

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
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold bg-accent text-accent-foreground shadow-xs transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 shrink-0" />
                <span>User Management</span>
              </div>
              {totalUsers > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-white/20 text-white">
                  {totalUsers}
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

      {/* Main Workspace Area */}
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
                  User Account Administration
                </h1>
                <Chip color="accent" variant="soft" size="sm" className="hidden sm:inline-flex text-[10px]">
                  Roster & Privileges
                </Chip>
              </div>
              <p className="text-[10px] text-muted hidden sm:block">
                Manage citizens, field technicians, department managers, and system administrators
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              isIconOnly
              size="sm"
              onPress={loadUsers}
              isDisabled={isLoading}
              aria-label="Refresh user roster"
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

        {/* Content Body */}
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
                onPress={loadUsers}
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

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="border border-border bg-surface p-4 rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  Total Accounts
                </span>
                <Users className="h-4 w-4 text-accent" />
              </div>
              <div className="text-2xl font-black text-foreground">
                {isLoading ? "--" : totalUsers}
              </div>
              <span className="text-[10px] text-muted">All registered members</span>
            </Card>

            <Card className="border border-border bg-surface p-4 rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  Active Citizens
                </span>
                <UserCheck className="h-4 w-4 text-success" />
              </div>
              <div className="text-2xl font-black text-foreground">
                {isLoading ? "--" : users.filter((u) => u.role === "citizen").length}
              </div>
              <span className="text-[10px] text-muted">Incident reporters</span>
            </Card>

            <Card className="border border-border bg-surface p-4 rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  Field Technicians
                </span>
                <Wrench className="h-4 w-4 text-warning" />
              </div>
              <div className="text-2xl font-black text-foreground">
                {isLoading
                  ? "--"
                  : users.filter((u) => u.role === "maintenance_staff").length}
              </div>
              <span className="text-[10px] text-muted">Assigned crew</span>
            </Card>

            <Card className="border border-border bg-surface p-4 rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  Managers & Admins
                </span>
                <ShieldCheck className="h-4 w-4 text-danger" />
              </div>
              <div className="text-2xl font-black text-foreground">
                {isLoading
                  ? "--"
                  : users.filter((u) =>
                      ["department_manager", "admin"].includes(u.role)
                    ).length}
              </div>
              <span className="text-[10px] text-muted">Supervisory staff</span>
            </Card>
          </div>

          {/* Search & Filter Controls */}
          <div className="p-4 rounded-2xl border border-border bg-surface shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search user accounts by name or email address..."
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

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Role filter */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted text-[11px] font-semibold hidden sm:inline">
                  Role:
                </span>
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 rounded-xl border border-border bg-surface text-foreground text-xs focus:outline-hidden focus:border-accent"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department filter */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted text-[11px] font-semibold hidden sm:inline">
                  Dept:
                </span>
                <select
                  value={departmentFilter}
                  onChange={(e) => {
                    setDepartmentFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 rounded-xl border border-border bg-surface text-foreground text-xs focus:outline-hidden focus:border-accent"
                >
                  <option value="all">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status filter */}
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
                  <option value="active">Active</option>
                  <option value="inactive">Suspended</option>
                </select>
              </div>

              {(searchInput ||
                roleFilter !== "all" ||
                departmentFilter !== "all" ||
                statusFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => {
                    setSearchInput("");
                    setRoleFilter("all");
                    setDepartmentFilter("all");
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

          {/* User Roster Table */}
          {isLoading ? (
            <div className="p-12 text-center rounded-2xl border border-border bg-surface space-y-3">
              <span className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin inline-block" />
              <p className="text-xs text-muted">Loading user registry...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-surface space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-surface-secondary text-muted flex items-center justify-center mx-auto">
                <Users className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-foreground">No Users Found</h4>
                <p className="text-xs text-muted max-w-sm mx-auto">
                  No accounts match the current filter or search criteria.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onPress={() => {
                  setSearchInput("");
                  setRoleFilter("all");
                  setDepartmentFilter("all");
                  setStatusFilter("all");
                }}
                className="cursor-pointer text-xs"
              >
                Clear Search & Filters
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-secondary/50 border-b border-border text-muted font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Member Name</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Department</th>
                      <th className="py-3.5 px-4">Account Status</th>
                      <th className="py-3.5 px-4">Registered Date</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {users.map((item) => (
                      <tr
                        key={item._id}
                        className="hover:bg-surface-secondary/40 transition-colors"
                      >
                        {/* Name & Email */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-xl bg-accent/15 text-accent font-bold flex items-center justify-center text-xs shrink-0">
                              {item.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-foreground text-xs block truncate">
                                {item.name}
                              </span>
                              <span className="text-[10px] text-muted block truncate font-mono">
                                {item.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderRoleBadge(item.role)}
                        </td>

                        {/* Department */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {item.department ? (
                            <span className="font-medium text-foreground">
                              {item.department.name}{" "}
                              <span className="text-[10px] font-mono text-muted">
                                ({item.department.code})
                              </span>
                            </span>
                          ) : (
                            <span className="text-muted text-[11px]">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Chip
                            color={item.isActive ? "success" : "danger"}
                            variant="soft"
                            size="sm"
                            className="text-[10px]"
                          >
                            {item.isActive ? "Active" : "Suspended"}
                          </Chip>
                        </td>

                        {/* Registered Date */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-muted font-mono text-[11px]">
                          {new Date(item.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onPress={() => setSelectedUser(item)}
                            className="cursor-pointer text-xs font-semibold text-accent hover:bg-accent/10 gap-1.5"
                          >
                            <UserCog className="h-3.5 w-3.5" /> Manage
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 rounded-2xl border border-border bg-surface flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-muted">
                Showing page <strong className="text-foreground">{page}</strong> of{" "}
                <strong className="text-foreground">{totalPages}</strong> ({totalUsers} total registered accounts)
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

      {/* User Action Modal */}
      <UserActionModal
        isOpen={Boolean(selectedUser)}
        user={selectedUser}
        departments={departments}
        currentAdminId={user?._id}
        token={token || ""}
        onClose={() => setSelectedUser(null)}
        onSuccess={(_, msg) => {
          setSuccessMessage(msg);
          loadUsers();
        }}
      />
    </div>
  );
}
