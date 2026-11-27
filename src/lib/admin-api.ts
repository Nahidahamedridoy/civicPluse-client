import { getApiBaseUrl } from "./auth";
import {
  CitizenIssue,
  IssueActivityLog,
  fetchIssueActivity,
  getStatusMeta,
  getPriorityMeta,
} from "./citizen-api";

export { getStatusMeta, getPriorityMeta, fetchIssueActivity };
export type { CitizenIssue, IssueActivityLog };

export interface IssueUserDetail {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

export interface IssueDepartmentDetail {
  _id: string;
  name: string;
  code?: string;
}

export interface AdminIssue extends Omit<CitizenIssue, "department" | "reportedBy" | "assignedTo"> {
  department?: IssueDepartmentDetail | null;
  reportedBy?: IssueUserDetail | null;
  assignedTo?: IssueUserDetail | null;
}

export interface AdminDashboardSummary {
  totalUsers: number;
  totalDepartments: number;
  totalIssues: number;
}

export interface IssuesByStatusMap {
  submitted: number;
  under_review: number;
  assigned: number;
  in_progress: number;
  resolved: number;
  closed: number;
}

export interface IssuesByPriorityMap {
  low: number;
  medium: number;
  high: number;
  urgent: number;
}

export interface AdminDashboardData {
  role: "admin";
  summary: AdminDashboardSummary;
  issuesByStatus: IssuesByStatusMap;
  issuesByPriority: IssuesByPriorityMap;
  recentIssues: AdminIssue[];
  recentActivities: unknown[];
}

export interface AnalyticsSummary {
  totalIssues: number;
  pendingIssues: number;
  resolvedIssues: number;
  resolutionRatePercentage: number;
  averageResolutionHours: number;
}

export interface CategoryDistributionItem {
  category: string;
  count: number;
}

export interface MonthlyTrendItem {
  month: string;
  count: number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  issuesByStatus: Array<{ status: string; count: number }>;
  issuesByPriority: Array<{ priority: string; count: number }>;
  issuesByDepartment: Array<{
    departmentId: string;
    departmentName: string;
    departmentCode: string;
    count: number;
  }>;
  issuesByCategory: CategoryDistributionItem[];
  monthlyTrends: MonthlyTrendItem[];
}

export interface DepartmentPerformanceItem {
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  totalIssues: number;
  pendingIssues: number;
  inProgressIssues: number;
  resolvedIssues: number;
  resolutionRatePercentage: number;
  averageResolutionHours: number;
  rank: number;
}

export interface DepartmentOption {
  _id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

export interface MaintenanceStaffOption {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: string;
  isActive: boolean;
  department?: {
    _id: string;
    name: string;
    code: string;
  } | string;
}

export interface AdminIssuesFilters {
  status?: string;
  priority?: string;
  category?: string;
  department?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminIssuesResponse {
  issues: AdminIssue[];
  count: number;
  total: number;
  page: number;
  totalPages: number;
}

export interface IssueProgressReport {
  _id: string;
  issue: string;
  staff: {
    _id: string;
    name: string;
    role: string;
    avatar?: string | null;
    phone?: string | null;
  };
  note: string;
  images?: string[];
  createdAt: string;
}

/**
 * Authorized fetch wrapper for Admin requests
 */
async function authorizedFetch<T>(
  endpoint: string,
  token: string,
  options?: RequestInit
): Promise<T> {
  const url = `${getApiBaseUrl()}${endpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options?.headers,
      },
    });
  } catch {
    throw new Error(
      "Unable to connect to the CivicPulse server. Please ensure the backend is running at http://localhost:5000."
    );
  }

  if (response.status === 401 || response.status === 403) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(
      errorJson.message || "Session expired or unauthorized. Admin credentials required."
    );
  }

  let json: { success?: boolean; message?: string; data?: T; [key: string]: unknown };
  try {
    json = await response.json();
  } catch {
    throw new Error("Invalid response format received from CivicPulse server.");
  }

  if (!response.ok || json.success === false) {
    throw new Error(json.message || "Failed to process request with CivicPulse API.");
  }

  return json as unknown as T;
}

/**
 * Fetches admin-wide dashboard statistics from GET /api/dashboard
 */
export async function fetchAdminDashboard(token: string): Promise<AdminDashboardData> {
  const res = await authorizedFetch<{
    success: boolean;
    data: AdminDashboardData;
  }>("/dashboard", token);

  return res.data;
}

/**
 * Analytics filtering parameters
 */
export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  department?: string;
}

/**
 * Fetches system-wide analytics, monthly trends, and category distribution from GET /api/analytics
 */
export async function fetchAdminAnalytics(
  token: string,
  filters?: AnalyticsFilters
): Promise<AnalyticsData> {
  const query = new URLSearchParams();
  if (filters?.startDate) query.set("startDate", filters.startDate);
  if (filters?.endDate) query.set("endDate", filters.endDate);
  if (filters?.department && filters.department !== "all") {
    query.set("department", filters.department);
  }

  const url = `/analytics${query.toString() ? `?${query.toString()}` : ""}`;
  const res = await authorizedFetch<{
    success: boolean;
    data: AnalyticsData;
  }>(url, token);

  return res.data;
}

/**
 * Fetches department-wise performance metrics and rankings from GET /api/analytics/department-performance
 * Backend response shape: { success, count, data: { departments: DepartmentPerformanceItem[] } }
 */
export async function fetchAdminDepartmentPerformance(
  token: string,
  filters?: AnalyticsFilters
): Promise<DepartmentPerformanceItem[]> {
  const query = new URLSearchParams();
  if (filters?.startDate) query.set("startDate", filters.startDate);
  if (filters?.endDate) query.set("endDate", filters.endDate);
  if (filters?.department && filters.department !== "all") {
    query.set("department", filters.department);
  }

  const url = `/analytics/department-performance${query.toString() ? `?${query.toString()}` : ""}`;
  const res = await authorizedFetch<{
    success: boolean;
    count: number;
    data: { departments: DepartmentPerformanceItem[] };
  }>(url, token);

  return res.data?.departments ?? [];
}

/**
 * Fetches latest issues across all departments from GET /api/issues
 */
export async function fetchRecentIssuesAllDepartments(
  token: string,
  limit = 8
): Promise<AdminIssue[]> {
  try {
    const res = await authorizedFetch<{
      success: boolean;
      data: { issues: AdminIssue[] };
    }>(`/issues?limit=${limit}`, token);

    return res.data?.issues || [];
  } catch {
    return [];
  }
}

/**
 * Fetches issues across all departments with search, filters, and pagination
 * Endpoint: GET /api/issues
 */
export async function fetchAdminIssues(
  token: string,
  filters?: AdminIssuesFilters
): Promise<AdminIssuesResponse> {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== "all") params.set("status", filters.status);
  if (filters?.priority && filters.priority !== "all") params.set("priority", filters.priority);
  if (filters?.category && filters.category !== "all") params.set("category", filters.category);
  if (filters?.department && filters.department !== "all") params.set("department", filters.department);
  if (filters?.search?.trim()) params.set("search", filters.search.trim());
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));

  const query = params.toString();
  const endpoint = query ? `/issues?${query}` : "/issues";

  const res = await authorizedFetch<{
    success: boolean;
    count: number;
    total: number;
    page: number;
    totalPages: number;
    data: { issues: AdminIssue[] };
  }>(endpoint, token);

  return {
    issues: res.data?.issues || [],
    count: res.count || 0,
    total: res.total || 0,
    page: res.page || 1,
    totalPages: res.totalPages || 1,
  };
}

/**
 * Fetches a single issue by ID
 * Endpoint: GET /api/issues/:id
 */
export async function fetchAdminIssueById(
  token: string,
  issueId: string
): Promise<AdminIssue> {
  const res = await authorizedFetch<{
    success: boolean;
    data: { issue: AdminIssue };
  }>(`/issues/${issueId}`, token);

  return res.data.issue;
}

/**
 * Fetches all active departments for filters and department assignment
 * Endpoint: GET /api/departments?limit=100
 */
export async function fetchActiveDepartments(
  token: string
): Promise<DepartmentOption[]> {
  try {
    const res = await authorizedFetch<{
      success: boolean;
      data: { departments: DepartmentOption[] };
    }>("/departments?limit=100", token);

    return res.data?.departments || [];
  } catch {
    return [];
  }
}

/**
 * Fetches active maintenance staff users (optionally filtered by department)
 * Endpoint: GET /api/admin/users?role=maintenance_staff&isActive=true&limit=100
 */
export async function fetchMaintenanceStaff(
  token: string,
  departmentId?: string
): Promise<MaintenanceStaffOption[]> {
  try {
    const endpoint = departmentId
      ? `/admin/users?role=maintenance_staff&isActive=true&department=${departmentId}&limit=100`
      : `/admin/users?role=maintenance_staff&isActive=true&limit=100`;

    const res = await authorizedFetch<{
      success: boolean;
      data: { users: MaintenanceStaffOption[] };
    }>(endpoint, token);

    return res.data?.users || [];
  } catch {
    return [];
  }
}

/**
 * Verifies submitted issue, assigning priority, department, and notes
 * Endpoint: PATCH /api/issues/:id/verify
 */
export async function verifyIssueByAdmin(
  token: string,
  issueId: string,
  payload: { priority?: string; department?: string; notes?: string }
): Promise<{ issue: AdminIssue; message: string }> {
  const res = await authorizedFetch<{
    success: boolean;
    message: string;
    data: { issue: AdminIssue };
  }>(`/issues/${issueId}/verify`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  return {
    issue: res.data.issue,
    message: res.message || "Issue verified successfully.",
  };
}

/**
 * Assigns an issue to a maintenance staff member
 * Endpoint: PATCH /api/issues/:id/assign
 */
export async function assignIssueByAdmin(
  token: string,
  issueId: string,
  staffId: string
): Promise<{ issue: AdminIssue; message: string }> {
  const res = await authorizedFetch<{
    success: boolean;
    message: string;
    data: { issue: AdminIssue };
  }>(`/issues/${issueId}/assign`, token, {
    method: "PATCH",
    body: JSON.stringify({ staffId }),
  });

  return {
    issue: res.data.issue,
    message: res.message || "Issue assigned successfully.",
  };
}

/**
 * Updates issue priority or department
 * Endpoint: PATCH /api/issues/:id
 */
export async function updateIssueDetailsByAdmin(
  token: string,
  issueId: string,
  payload: { priority?: string; department?: string; title?: string; description?: string }
): Promise<{ issue: AdminIssue; message: string }> {
  const res = await authorizedFetch<{
    success: boolean;
    message: string;
    data: { issue: AdminIssue };
  }>(`/issues/${issueId}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  return {
    issue: res.data.issue,
    message: res.message || "Issue details updated successfully.",
  };
}

/**
 * Updates issue status
 * Endpoint: PATCH /api/issues/:id/status
 */
export async function updateIssueStatusByAdmin(
  token: string,
  issueId: string,
  status: string,
  notes?: string
): Promise<{ issue: AdminIssue; message: string }> {
  const res = await authorizedFetch<{
    success: boolean;
    message: string;
    data: { issue: AdminIssue };
  }>(`/issues/${issueId}/status`, token, {
    method: "PATCH",
    body: JSON.stringify({ status, notes: notes?.trim() || undefined }),
  });

  return {
    issue: res.data.issue,
    message: res.message || "Issue status updated successfully.",
  };
}

/**
 * Fetches progress reports for an issue
 * Endpoint: GET /api/issues/:id/progress-reports
 */
export async function fetchIssueProgressReports(
  token: string,
  issueId: string
): Promise<IssueProgressReport[]> {
  try {
    const res = await authorizedFetch<{
      success: boolean;
      count: number;
      data: { reports: IssueProgressReport[] };
    }>(`/issues/${issueId}/progress-reports`, token);

    return res.data?.reports || [];
  } catch {
    return [];
  }
}

// ==========================================
// Department Management Interfaces & Helpers
// ==========================================

export interface AdminDepartment {
  _id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserRecord {
  _id: string;
  name: string;
  email: string;
  role: "citizen" | "maintenance_staff" | "department_manager" | "admin";
  phone?: string;
  avatar?: string;
  isActive: boolean;
  department?: {
    _id: string;
    name: string;
    code: string;
  } | null;
  createdAt: string;
}

export interface DepartmentWorkloadStaffItem {
  staff: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
    role: string;
    isActive: boolean;
  };
  assigned: number;
  inProgress: number;
  resolved: number;
  activeWorkload: number;
}

export interface DepartmentWorkloadResponse {
  department: {
    _id: string;
    name: string;
    code: string;
  };
  staffWorkload: DepartmentWorkloadStaffItem[];
  totalStaff: number;
  page: number;
  totalPages: number;
}

export interface AdminDepartmentsFilter {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface AdminDepartmentsResponse {
  departments: AdminDepartment[];
  count: number;
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Fetches all departments with pagination, search, and active status filtering
 * Endpoint: GET /api/departments
 */
export async function fetchAdminDepartments(
  token: string,
  filters?: AdminDepartmentsFilter
): Promise<AdminDepartmentsResponse> {
  const query = new URLSearchParams();
  if (filters?.page) query.set("page", String(filters.page));
  if (filters?.limit) query.set("limit", String(filters.limit));
  if (filters?.search?.trim()) query.set("search", filters.search.trim());
  if (filters?.isActive !== undefined) query.set("isActive", String(filters.isActive));

  const url = `/departments${query.toString() ? `?${query.toString()}` : ""}`;
  const res = await authorizedFetch<{
    success: boolean;
    count: number;
    total: number;
    page: number;
    totalPages: number;
    data: { departments: AdminDepartment[] };
  }>(url, token);

  return {
    departments: res.data?.departments || [],
    count: res.count || 0,
    total: res.total || 0,
    page: res.page || 1,
    totalPages: res.totalPages || 1,
  };
}

/**
 * Fetches single department details by ID
 * Endpoint: GET /api/departments/:id
 */
export async function fetchDepartmentById(
  token: string,
  id: string
): Promise<AdminDepartment> {
  const res = await authorizedFetch<{
    success: boolean;
    data: { department: AdminDepartment };
  }>(`/departments/${id}`, token);

  return res.data.department;
}

/**
 * Creates a new department
 * Endpoint: POST /api/departments
 */
export async function createDepartmentByAdmin(
  token: string,
  payload: { name: string; code: string; description?: string }
): Promise<{ department: AdminDepartment; message: string }> {
  const res = await authorizedFetch<{
    success: boolean;
    message: string;
    data: { department: AdminDepartment };
  }>("/departments", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return {
    department: res.data.department,
    message: res.message || "Department created successfully.",
  };
}

/**
 * Updates an existing department
 * Endpoint: PATCH /api/departments/:id
 */
export async function updateDepartmentByAdmin(
  token: string,
  id: string,
  payload: { name?: string; code?: string; description?: string; isActive?: boolean }
): Promise<{ department: AdminDepartment; message: string }> {
  const res = await authorizedFetch<{
    success: boolean;
    message: string;
    data: { department: AdminDepartment };
  }>(`/departments/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  return {
    department: res.data.department,
    message: res.message || "Department updated successfully.",
  };
}

/**
 * Soft deletes (deactivates) a department
 * Endpoint: DELETE /api/departments/:id
 */
export async function deleteDepartmentByAdmin(
  token: string,
  id: string
): Promise<{ department: AdminDepartment; message: string }> {
  const res = await authorizedFetch<{
    success: boolean;
    message: string;
    data: { department: AdminDepartment };
  }>(`/departments/${id}`, token, {
    method: "DELETE",
  });

  return {
    department: res.data.department,
    message: res.message || "Department deactivated successfully.",
  };
}

/**
 * Fetches department workload and staff assignment details
 * Endpoint: GET /api/departments/:id/workload
 */
export async function fetchDepartmentWorkload(
  token: string,
  deptId: string
): Promise<DepartmentWorkloadResponse | null> {
  try {
    const res = await authorizedFetch<{
      success: boolean;
      data: DepartmentWorkloadResponse;
    }>(`/departments/${deptId}/workload`, token);

    return res.data;
  } catch {
    return null;
  }
}

/**
 * Fetches users with optional filters (e.g., department managers, staff)
 * Endpoint: GET /api/admin/users
 */
export async function fetchAdminUsers(
  token: string,
  params?: {
    role?: string;
    department?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }
): Promise<{ users: AdminUserRecord[]; total: number; page: number; totalPages: number }> {
  try {
    const query = new URLSearchParams();
    if (params?.role && params.role !== "all") query.set("role", params.role);
    if (params?.department && params.department !== "all") query.set("department", params.department);
    if (params?.isActive !== undefined) query.set("isActive", String(params.isActive));
    if (params?.search?.trim()) query.set("search", params.search.trim());
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));

    const res = await authorizedFetch<{
      success: boolean;
      total: number;
      page: number;
      totalPages: number;
      data: { users: AdminUserRecord[] };
    }>(`/admin/users?${query.toString()}`, token);

    return {
      users: res.data?.users || [],
      total: res.total || 0,
      page: res.page || 1,
      totalPages: res.totalPages || 1,
    };
  } catch {
    return { users: [], total: 0, page: 1, totalPages: 1 };
  }
}

/**
 * Fetches single user details by ID
 * Endpoint: GET /api/admin/users/:id
 */
export async function fetchAdminUserById(
  token: string,
  id: string
): Promise<AdminUserRecord> {
  const res = await authorizedFetch<{
    success: boolean;
    data: { user: AdminUserRecord };
  }>(`/admin/users/${id}`, token);

  return res.data.user;
}

/**
 * Updates user role (and department if applicable)
 * Endpoint: PATCH /api/admin/users/:id/role
 */
export async function updateUserRoleByAdmin(
  token: string,
  userId: string,
  role: string,
  department?: string | null
): Promise<{ user: AdminUserRecord; message: string }> {
  const res = await authorizedFetch<{
    success: boolean;
    message: string;
    data: { user: AdminUserRecord };
  }>(`/admin/users/${userId}/role`, token, {
    method: "PATCH",
    body: JSON.stringify({ role, department: department || undefined }),
  });

  return {
    user: res.data.user,
    message: res.message || `User role updated to ${role}.`,
  };
}

/**
 * Activates or deactivates user accounts
 * Endpoint: PATCH /api/admin/users/:id/status
 */
export async function updateUserStatusByAdmin(
  token: string,
  userId: string,
  isActive: boolean
): Promise<{ user: AdminUserRecord; message: string }> {
  const res = await authorizedFetch<{
    success: boolean;
    message: string;
    data: { user: AdminUserRecord };
  }>(`/admin/users/${userId}/status`, token, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });

  return {
    user: res.data.user,
    message: res.message || `User account ${isActive ? "activated" : "deactivated"} successfully.`,
  };
}

/**
 * Reassigns or assigns a user's department
 * Endpoint: PATCH /api/admin/users/:id
 */
export async function assignUserDepartment(
  token: string,
  userId: string,
  departmentId: string | null
): Promise<{ user: AdminUserRecord; message: string }> {
  const res = await authorizedFetch<{
    success: boolean;
    message: string;
    data: { user: AdminUserRecord };
  }>(`/admin/users/${userId}`, token, {
    method: "PATCH",
    body: JSON.stringify({ department: departmentId }),
  });

  return {
    user: res.data.user,
    message: res.message || "User department assignment updated successfully.",
  };
}
