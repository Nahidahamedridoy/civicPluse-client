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
  avatar?: string | null;
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
 * Fetches system-wide analytics, monthly trends, and category distribution from GET /api/analytics
 */
export async function fetchAdminAnalytics(token: string): Promise<AnalyticsData> {
  const res = await authorizedFetch<{
    success: boolean;
    data: AnalyticsData;
  }>("/analytics", token);

  return res.data;
}

/**
 * Fetches department-wise performance metrics and rankings from GET /api/analytics/department-performance
 */
export async function fetchAdminDepartmentPerformance(
  token: string
): Promise<DepartmentPerformanceItem[]> {
  const res = await authorizedFetch<{
    success: boolean;
    data: DepartmentPerformanceItem[];
  }>("/analytics/department-performance", token);

  return res.data || [];
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
