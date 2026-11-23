import { getApiBaseUrl, User } from "./auth";

export interface IssueLocation {
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  coordinates?: [number, number];
}

export interface IssueDepartment {
  _id: string;
  name: string;
  code?: string;
}

export interface IssueAssignedUser {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

export interface CitizenIssue {
  _id: string;
  title: string;
  description: string;
  category: string;
  status:
    | "submitted"
    | "under_review"
    | "assigned"
    | "in_progress"
    | "resolved"
    | "closed"
    | string;
  priority: "low" | "medium" | "high" | "urgent" | string;
  department?: IssueDepartment | null;
  assignedTo?: IssueAssignedUser | null;
  location?: IssueLocation | null;
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CitizenDashboardSummary {
  totalReportedIssues: number;
  pendingIssues: number;
  inProgressIssues: number;
  resolvedIssues: number;
}

export interface CitizenDashboardData {
  role: "citizen";
  summary: CitizenDashboardSummary;
  recentReports: CitizenIssue[];
}

export interface MyReportsResponse {
  issues: CitizenIssue[];
  count: number;
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Maps raw backend status values to user-facing labels and HeroUI color tokens.
 */
export function getStatusMeta(status: string): {
  label: string;
  color: "warning" | "accent" | "success" | "default" | "danger";
  group: "pending" | "in_progress" | "resolved";
} {
  switch (status?.toLowerCase()) {
    case "submitted":
      return { label: "Submitted", color: "warning", group: "pending" };
    case "under_review":
      return { label: "Under Review", color: "warning", group: "pending" };
    case "assigned":
      return { label: "Dispatched", color: "accent", group: "in_progress" };
    case "in_progress":
      return { label: "In Progress", color: "accent", group: "in_progress" };
    case "resolved":
      return { label: "Resolved", color: "success", group: "resolved" };
    case "closed":
      return { label: "Closed & Verified", color: "default", group: "resolved" };
    default:
      return { label: status || "Unknown", color: "default", group: "pending" };
  }
}

/**
 * Maps raw backend priority values to user-facing labels and HeroUI color tokens.
 */
export function getPriorityMeta(priority?: string): {
  label: string;
  color: "danger" | "warning" | "accent" | "default";
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

/**
 * Helper to execute authorized requests to the backend.
 * Handles unauthorized and server error responses.
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
    throw new Error(errorJson.message || "Session expired or unauthorized. Please sign in again.");
  }

  let json: { success?: boolean; message?: string; data?: T; [key: string]: unknown };
  try {
    json = await response.json();
  } catch {
    throw new Error("Invalid response format received from CivicPulse server.");
  }

  if (!response.ok || json.success === false) {
    throw new Error(json.message || "Failed to fetch data from CivicPulse API.");
  }

  return json as unknown as T;
}

/**
 * Fetches dashboard statistics and 5 most recent reports for the authenticated citizen.
 * Endpoint: GET /api/dashboard
 */
export async function fetchCitizenDashboard(token: string): Promise<CitizenDashboardData> {
  const res = await authorizedFetch<{
    success: boolean;
    data: CitizenDashboardData;
  }>("/dashboard", token);

  return res.data;
}

/**
 * Fetches citizen's reports with optional status, priority, and search filters.
 * Endpoint: GET /api/issues/my-reports
 */
export async function fetchMyReports(
  token: string,
  filters?: {
    status?: string;
    priority?: string;
    search?: string;
    page?: number;
    limit?: number;
  }
): Promise<MyReportsResponse> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.priority) params.set("priority", filters.priority);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await authorizedFetch<{
    success: boolean;
    count: number;
    total: number;
    page: number;
    totalPages: number;
    data: {
      issues: CitizenIssue[];
    };
  }>(`/issues/my-reports${query}`, token);

  return {
    issues: res.data?.issues || [],
    count: res.count || 0,
    total: res.total || 0,
    page: res.page || 1,
    totalPages: res.totalPages || 1,
  };
}

/**
 * Fetches current authenticated citizen profile.
 * Endpoint: GET /api/users/profile
 */
export async function fetchCitizenProfile(token: string): Promise<User> {
  const res = await authorizedFetch<{
    success: boolean;
    data: {
      user: User;
    };
  }>("/users/profile", token);

  return res.data.user;
}

/**
 * Fetches unread notifications count for the authenticated citizen.
 * Endpoint: GET /api/notifications/unread-count
 */
export async function fetchUnreadNotificationCount(token: string): Promise<number> {
  try {
    const res = await authorizedFetch<{
      success: boolean;
      data: {
        unreadCount: number;
      };
    }>("/notifications/unread-count", token);

    return res.data?.unreadCount || 0;
  } catch {
    return 0;
  }
}
