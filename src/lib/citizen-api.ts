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

export interface DepartmentItem {
  _id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

export interface MyReportsResponse {
  issues: CitizenIssue[];
  count: number;
  total: number;
  page: number;
  totalPages: number;
}

export interface PotentialDuplicateItem {
  issue: {
    _id: string;
    title: string;
    description: string;
    category: string;
    status: string;
    priority: string;
    location?: IssueLocation | null;
    department?: IssueDepartment | null;
    createdAt: string;
  };
  similarityScore: number;
  confidence: "high" | "medium" | "low";
  distanceMeters: number | null;
  distanceKm: number | null;
  reasons: string[];
}

export interface DuplicateCheckResponse {
  success: boolean;
  count: number;
  data: {
    query: {
      title?: string;
      category?: string;
      location?: { latitude: number; longitude: number } | null;
      searchRadiusMeters?: number | null;
    };
    potentialDuplicates: PotentialDuplicateItem[];
  };
}

export interface ActivityLogActor {
  _id: string;
  name: string;
  role: string;
  avatar?: string | null;
}

export interface IssueActivityLog {
  _id: string;
  issue: string;
  performedBy: ActivityLogActor;
  action: string;
  description: string;
  previousStatus?: string | null;
  newStatus?: string | null;
  createdAt: string;
}

export interface CommentUser {
  _id: string;
  name: string;
  role: string;
  avatar?: string | null;
}

export interface IssueComment {
  _id: string;
  issue: string;
  user: CommentUser;
  message: string;
  createdAt: string;
}

export interface IssueFeedback {
  _id: string;
  issue: string;
  citizen: {
    _id: string;
    name: string;
    avatar?: string | null;
  };
  rating: number;
  comment?: string;
  createdAt: string;
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
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }
): Promise<MyReportsResponse> {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== "all") params.set("status", filters.status);
  if (filters?.priority && filters.priority !== "all") params.set("priority", filters.priority);
  if (filters?.category && filters.category !== "all") params.set("category", filters.category);
  if (filters?.search?.trim()) params.set("search", filters.search.trim());
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
 * Fetches single issue details by ID.
 * Endpoint: GET /api/issues/:id
 */
export async function fetchIssueById(token: string, id: string): Promise<CitizenIssue> {
  const res = await authorizedFetch<{
    success: boolean;
    data: {
      issue: CitizenIssue;
    };
  }>(`/issues/${id}`, token);

  return res.data.issue;
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

/**
 * Fetches active departments.
 * Endpoint: GET /api/departments
 */
export async function fetchDepartments(token: string): Promise<DepartmentItem[]> {
  try {
    const res = await authorizedFetch<{
      success: boolean;
      data: {
        departments: DepartmentItem[];
      };
    }>("/departments?limit=50", token);

    return res.data?.departments || [];
  } catch (error) {
    console.error("Failed to fetch departments:", error);
    return [];
  }
}

/**
 * Submits a new issue report using multipart/form-data.
 * Endpoint: POST /api/issues
 */
export async function submitIssueReport(
  token: string,
  formData: FormData
): Promise<CitizenIssue> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/issues`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        // Do NOT set Content-Type header so browser computes correct multipart boundary
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
  } catch {
    throw new Error(
      "Unable to connect to the CivicPulse server. Please ensure the backend is running at http://localhost:5000."
    );
  }

  if (response.status === 401 || response.status === 403) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(
      errorJson.message || "Session expired or unauthorized. Please sign in again."
    );
  }

  let json: {
    success?: boolean;
    message?: string;
    error?: string;
    data?: {
      issue: CitizenIssue;
    };
  };

  try {
    json = await response.json();
  } catch {
    throw new Error("Invalid response format received from CivicPulse server.");
  }

  if (!response.ok || json.success === false) {
    throw new Error(json.message || json.error || "Failed to submit issue report.");
  }

  if (!json.data?.issue) {
    throw new Error("Issue report was accepted but server did not return issue details.");
  }

  return json.data.issue;
}

/**
 * Checks for potential duplicate issues nearby based on title, category, and coordinates.
 * Endpoint: GET /api/issues/check-duplicates
 */
export async function checkDuplicateIssues(
  token: string,
  params: {
    title: string;
    category?: string;
    latitude?: number | string;
    longitude?: number | string;
    radius?: number;
    department?: string;
  }
): Promise<PotentialDuplicateItem[]> {
  if (!params.title || params.title.trim().length < 3) {
    return [];
  }

  const queryParams = new URLSearchParams();
  queryParams.set("title", params.title.trim());
  if (params.category?.trim()) queryParams.set("category", params.category.trim());
  if (params.latitude !== undefined && params.latitude !== "" && !isNaN(Number(params.latitude))) {
    queryParams.set("latitude", String(params.latitude));
  }
  if (params.longitude !== undefined && params.longitude !== "" && !isNaN(Number(params.longitude))) {
    queryParams.set("longitude", String(params.longitude));
  }
  if (params.radius) queryParams.set("radius", String(params.radius));
  if (params.department) queryParams.set("department", params.department);

  try {
    const res = await authorizedFetch<DuplicateCheckResponse>(
      `/issues/check-duplicates?${queryParams.toString()}`,
      token
    );
    return res.data?.potentialDuplicates || [];
  } catch (error) {
    console.warn("CivicPulse duplicate check non-blocking error:", error);
    return [];
  }
}

/**
 * Fetches activity logs for a specific issue.
 * Endpoint: GET /api/issues/:id/activity
 */
export async function fetchIssueActivity(
  token: string,
  issueId: string
): Promise<IssueActivityLog[]> {
  const res = await authorizedFetch<{
    success: boolean;
    count: number;
    data: {
      logs: IssueActivityLog[];
    };
  }>(`/issues/${issueId}/activity?limit=50`, token);

  return res.data?.logs || [];
}

/**
 * Fetches comments for a specific issue.
 * Endpoint: GET /api/issues/:id/comments
 */
export async function fetchIssueComments(
  token: string,
  issueId: string
): Promise<IssueComment[]> {
  const res = await authorizedFetch<{
    success: boolean;
    count: number;
    data: {
      comments: IssueComment[];
    };
  }>(`/issues/${issueId}/comments?limit=100`, token);

  return res.data?.comments || [];
}

/**
 * Submits a new comment on an issue.
 * Endpoint: POST /api/issues/:id/comments
 */
export async function postIssueComment(
  token: string,
  issueId: string,
  message: string
): Promise<IssueComment> {
  const res = await authorizedFetch<{
    success: boolean;
    message: string;
    data: {
      comment: IssueComment;
    };
  }>(`/issues/${issueId}/comments`, token, {
    method: "POST",
    body: JSON.stringify({ message }),
  });

  return res.data.comment;
}

/**
 * Fetches existing citizen feedback for an issue.
 * Endpoint: GET /api/issues/:id/feedback
 */
export async function fetchIssueFeedback(
  token: string,
  issueId: string
): Promise<IssueFeedback | null> {
  try {
    const res = await authorizedFetch<{
      success: boolean;
      data: {
        feedback: IssueFeedback;
      };
    }>(`/issues/${issueId}/feedback`, token);

    return res.data?.feedback || null;
  } catch {
    return null;
  }
}

/**
 * Submits citizen feedback for a resolved or closed issue.
 * Endpoint: POST /api/issues/:id/feedback
 */
export async function submitIssueFeedback(
  token: string,
  issueId: string,
  rating: number,
  comment?: string
): Promise<IssueFeedback> {
  const res = await authorizedFetch<{
    success: boolean;
    message: string;
    data: {
      feedback: IssueFeedback;
    };
  }>(`/issues/${issueId}/feedback`, token, {
    method: "POST",
    body: JSON.stringify({ rating, comment: comment || "" }),
  });

  return res.data.feedback;
}

