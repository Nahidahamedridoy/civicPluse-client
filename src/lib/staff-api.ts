import { getApiBaseUrl } from "./auth";

/**
 * Authorized fetch wrapper for Staff requests
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
      errorJson.message || "Session expired or unauthorized. Staff credentials required."
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

export interface StaffLocation {
  address?: string;
  latitude?: number;
  longitude?: number;
  coordinates?: [number, number];
}

export interface StaffIssueReporter {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
}

export interface StaffIssueDepartment {
  _id: string;
  name: string;
  code: string;
}

export interface StaffIssue {
  _id: string;
  title: string;
  description: string;
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "submitted" | "under_review" | "assigned" | "in_progress" | "resolved" | "closed";
  department?: StaffIssueDepartment;
  reportedBy?: StaffIssueReporter;
  assignedTo?: StaffIssueReporter;
  location?: StaffLocation;
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StaffDashboardData {
  role: "maintenance_staff";
  summary: {
    assignedIssues: number;
    inProgressIssues: number;
    resolvedIssues: number;
  };
  recentIssues: StaffIssue[];
}

export interface StaffProgressReport {
  _id: string;
  issue: string;
  staff: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  note: string;
  images?: string[];
  createdAt: string;
}

export interface StaffActivityItem {
  _id: string;
  action: string;
  description: string;
  performedBy?: {
    _id: string;
    name: string;
    role: string;
    avatar?: string;
  };
  previousStatus?: string;
  newStatus?: string;
  createdAt: string;
}

export interface StaffIssuesFilter {
  status?: string;
  priority?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Fetches the maintenance staff dashboard statistics and recent assignments
 * Endpoint: GET /api/dashboard
 */
export async function fetchStaffDashboard(token: string): Promise<StaffDashboardData> {
  const res = await authorizedFetch<{
    success: boolean;
    data: StaffDashboardData;
  }>("/dashboard", token);

  return res.data;
}

/**
 * Fetches all assigned issues for the logged-in maintenance staff member
 * Endpoint: GET /api/issues/assigned
 */
export async function fetchStaffAssignedIssues(
  token: string,
  filters?: StaffIssuesFilter
): Promise<{ issues: StaffIssue[]; total: number; page: number; totalPages: number }> {
  const query = new URLSearchParams();
  if (filters?.status && filters.status !== "all") query.set("status", filters.status);
  if (filters?.priority && filters.priority !== "all") query.set("priority", filters.priority);
  if (filters?.search?.trim()) query.set("search", filters.search.trim());
  if (filters?.page) query.set("page", String(filters.page));
  if (filters?.limit) query.set("limit", String(filters.limit));

  const url = `/issues/assigned${query.toString() ? `?${query.toString()}` : ""}`;
  const res = await authorizedFetch<{
    success: boolean;
    total: number;
    page: number;
    totalPages: number;
    data: { issues: StaffIssue[] };
  }>(url, token);

  return {
    issues: res.data?.issues || [],
    total: res.total || 0,
    page: res.page || 1,
    totalPages: res.totalPages || 1,
  };
}

/**
 * Fetches issue details by ID
 * Endpoint: GET /api/issues/:id
 */
export async function fetchStaffIssueById(
  token: string,
  issueId: string
): Promise<StaffIssue> {
  const res = await authorizedFetch<{
    success: boolean;
    data: { issue: StaffIssue };
  }>(`/issues/${issueId}`, token);

  return res.data.issue;
}

/**
 * Updates status of an assigned issue (maintenance staff can transition to 'in_progress' or 'resolved')
 * Endpoint: PATCH /api/issues/:id/status
 */
export async function updateStaffTaskStatus(
  token: string,
  issueId: string,
  status: "in_progress" | "resolved",
  notes?: string
): Promise<{ issue: StaffIssue; message: string }> {
  const res = await authorizedFetch<{
    success: boolean;
    message: string;
    data: { issue: StaffIssue };
  }>(`/issues/${issueId}/status`, token, {
    method: "PATCH",
    body: JSON.stringify({ status, notes: notes?.trim() || undefined }),
  });

  return {
    issue: res.data.issue,
    message: res.message || `Task status updated to ${status}.`,
  };
}

/**
 * Submits work progress / completion report with notes and photos
 * Endpoint: POST /api/issues/:id/progress-reports
 */
export async function submitStaffProgressReport(
  token: string,
  issueId: string,
  payload: { note: string; images?: string[] }
): Promise<{ report: StaffProgressReport; message: string }> {
  const res = await authorizedFetch<{
    success: boolean;
    message: string;
    data: { report: StaffProgressReport };
  }>(`/issues/${issueId}/progress-reports`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return {
    report: res.data.report,
    message: res.message || "Progress report submitted successfully.",
  };
}

/**
 * Fetches progress reports for an issue
 * Endpoint: GET /api/issues/:id/progress-reports
 */
export async function fetchStaffProgressReports(
  token: string,
  issueId: string
): Promise<StaffProgressReport[]> {
  try {
    const res = await authorizedFetch<{
      success: boolean;
      data: { reports: StaffProgressReport[] };
    }>(`/issues/${issueId}/progress-reports`, token);

    return res.data?.reports || [];
  } catch {
    return [];
  }
}

/**
 * Fetches activity timeline logs for an issue
 * Endpoint: GET /api/issues/:id/activity
 */
export async function fetchStaffIssueActivity(
  token: string,
  issueId: string
): Promise<StaffActivityItem[]> {
  try {
    const res = await authorizedFetch<{
      success: boolean;
      data: { activityLogs: StaffActivityItem[] };
    }>(`/issues/${issueId}/activity`, token);

    return res.data?.activityLogs || [];
  } catch {
    return [];
  }
}

/**
 * Priority and status display metadata helpers
 */
export function getStaffPriorityMeta(priority?: string): {
  label: string;
  color: "default" | "accent" | "success" | "warning" | "danger";
} {
  switch (priority?.toLowerCase()) {
    case "urgent":
      return { label: "Urgent", color: "danger" };
    case "high":
      return { label: "High", color: "warning" };
    case "medium":
      return { label: "Medium", color: "accent" };
    case "low":
    default:
      return { label: "Low", color: "default" };
  }
}

export function getStaffStatusMeta(status?: string): {
  label: string;
  color: "default" | "accent" | "success" | "warning" | "danger";
} {
  switch (status?.toLowerCase()) {
    case "submitted":
      return { label: "Submitted", color: "default" };
    case "under_review":
      return { label: "Under Review", color: "warning" };
    case "assigned":
      return { label: "Assigned", color: "accent" };
    case "in_progress":
      return { label: "In Progress", color: "warning" };
    case "resolved":
      return { label: "Resolved", color: "success" };
    case "closed":
      return { label: "Closed", color: "default" };
    default:
      return { label: status || "Unknown", color: "default" };
  }
}
