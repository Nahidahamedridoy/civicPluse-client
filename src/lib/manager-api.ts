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

export interface IssueReporter {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string | null;
}

export interface ManagerIssue extends CitizenIssue {
  reportedBy?: IssueReporter | null;
}

export interface ManagerDepartmentSummary {
  totalIssues: number;
  pendingIssues: number;
  inProgressIssues: number;
  resolvedIssues: number;
  staffCount: number;
}

export interface ManagerDashboardData {
  role: "department_manager";
  departmentId: string;
  summary: ManagerDepartmentSummary;
  recentIssues: ManagerIssue[];
}

export interface StaffMember {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: string;
  isActive: boolean;
}

export interface StaffWorkloadItem {
  staff: StaffMember;
  assigned: number;
  inProgress: number;
  resolved: number;
  activeWorkload: number;
}

export interface DepartmentWorkloadData {
  department: {
    _id: string;
    name: string;
    code: string;
  };
  staffWorkload: StaffWorkloadItem[];
  totalStaff: number;
  page?: number;
  totalPages?: number;
}

export interface DepartmentDetails {
  _id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

export interface DepartmentIssuesFilters {
  status?: string;
  priority?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface DepartmentIssuesResponse {
  issues: ManagerIssue[];
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
 * Authorized fetch wrapper for manager endpoints
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

  if (response.status === 401) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(
      errorJson.message || "Session expired or unauthorized. Please sign in again."
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
 * Fetches dashboard statistics and 5 most recent department issues for the department manager.
 * Endpoint: GET /api/dashboard
 */
export async function fetchManagerDashboard(token: string): Promise<ManagerDashboardData> {
  const res = await authorizedFetch<{
    success: boolean;
    data: ManagerDashboardData;
  }>("/dashboard", token);

  return res.data;
}

/**
 * Fetches staff workload distribution for the manager's assigned department.
 * Endpoint: GET /api/departments/workload
 */
export async function fetchDepartmentWorkload(
  token: string,
  limit = 100
): Promise<DepartmentWorkloadData | null> {
  try {
    const res = await authorizedFetch<{
      success: boolean;
      data: DepartmentWorkloadData;
    }>(`/departments/workload?limit=${limit}`, token);

    return res.data;
  } catch (error) {
    console.warn("Could not load department workload:", error);
    return null;
  }
}

/**
 * Fetches specific department details by ID.
 * Endpoint: GET /api/departments/:id
 */
export async function fetchDepartmentById(
  token: string,
  departmentId: string
): Promise<DepartmentDetails | null> {
  try {
    const res = await authorizedFetch<{
      success: boolean;
      data: { department: DepartmentDetails };
    }>(`/departments/${departmentId}`, token);

    return res.data?.department || null;
  } catch {
    return null;
  }
}

/**
 * Fetches issues scoped to the authenticated manager's department with filters and pagination.
 * Endpoint: GET /api/issues
 */
export async function fetchDepartmentIssues(
  token: string,
  filters?: DepartmentIssuesFilters
): Promise<DepartmentIssuesResponse> {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== "all") params.set("status", filters.status);
  if (filters?.priority && filters.priority !== "all") params.set("priority", filters.priority);
  if (filters?.category && filters.category !== "all") params.set("category", filters.category);
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
    data: { issues: ManagerIssue[] };
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
 * Fetches a single department issue by ID.
 * Endpoint: GET /api/issues/:id
 */
export async function fetchDepartmentIssueById(
  token: string,
  issueId: string
): Promise<ManagerIssue> {
  const res = await authorizedFetch<{
    success: boolean;
    data: { issue: ManagerIssue };
  }>(`/issues/${issueId}`, token);

  return res.data.issue;
}

/**
 * Verifies a submitted issue, transitioning it to 'under_review' and optionally setting priority/notes.
 * Endpoint: PATCH /api/issues/:id/verify
 */
export async function verifyDepartmentIssue(
  token: string,
  issueId: string,
  payload: { priority?: string; notes?: string }
): Promise<{ issue: ManagerIssue; message: string }> {
  const res = await authorizedFetch<{
    success: boolean;
    message: string;
    data: { issue: ManagerIssue };
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
 * Updates issue priority (or details) by department manager.
 * Endpoint: PATCH /api/issues/:id
 */
export async function updateIssuePriority(
  token: string,
  issueId: string,
  priority: string
): Promise<{ issue: ManagerIssue; message: string }> {
  const res = await authorizedFetch<{
    success: boolean;
    message: string;
    data: { issue: ManagerIssue };
  }>(`/issues/${issueId}`, token, {
    method: "PATCH",
    body: JSON.stringify({ priority }),
  });

  return {
    issue: res.data.issue,
    message: res.message || "Issue priority updated successfully.",
  };
}

/**
 * Assigns an issue to a maintenance staff member in the same department.
 * Endpoint: PATCH /api/issues/:id/assign
 */
export async function assignIssueToStaff(
  token: string,
  issueId: string,
  staffId: string
): Promise<{ issue: ManagerIssue; message: string }> {
  const res = await authorizedFetch<{
    success: boolean;
    message: string;
    data: { issue: ManagerIssue };
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
 * Updates issue status with backend transition validation.
 * Endpoint: PATCH /api/issues/:id/status
 */
export async function updateDepartmentIssueStatus(
  token: string,
  issueId: string,
  status: string,
  notes?: string
): Promise<{ issue: ManagerIssue; message: string }> {
  const res = await authorizedFetch<{
    success: boolean;
    message: string;
    data: { issue: ManagerIssue };
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
 * Fetches work progress / resolution reports for a specific issue.
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
