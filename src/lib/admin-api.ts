import { getApiBaseUrl } from "./auth";
import { CitizenIssue, getStatusMeta, getPriorityMeta } from "./citizen-api";

export { getStatusMeta, getPriorityMeta };
export type { CitizenIssue };

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
  recentIssues: CitizenIssue[];
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
): Promise<CitizenIssue[]> {
  try {
    const res = await authorizedFetch<{
      success: boolean;
      data: { issues: CitizenIssue[] };
    }>(`/issues?limit=${limit}`, token);

    return res.data?.issues || [];
  } catch {
    return [];
  }
}
