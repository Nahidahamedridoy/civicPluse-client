/**
 * CivicPulse Authentication Service & Storage Utility
 * Integrates with Express backend auth APIs (/api/auth/login, /api/auth/register).
 * Handles JWT tokens securely without logging or exposing credentials.
 */

export interface User {
  _id: string;
  name: string;
  email: string;
  role: "citizen" | "admin" | "department_manager" | "maintenance_staff" | string;
  phone?: string | null;
  avatar?: string | null;
  department?: string | null;
  isActive?: boolean;
  isEmailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthSuccessData {
  user: User;
  token: string;
}

export interface AuthApiResponse {
  success: boolean;
  message: string;
  data?: AuthSuccessData;
  error?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterCitizenPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

const TOKEN_STORAGE_KEY = "civicpulse_auth_token";
const USER_STORAGE_KEY = "civicpulse_auth_user";

/**
 * Returns the base API URL without trailing slashes.
 * Defaults to http://localhost:5000/api if not configured.
 */
export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  return url.replace(/\/+$/, "");
}

/**
 * Maps user roles to their respective dashboard destination.
 * Requirement 6:
 *  - Citizen -> /citizen/dashboard
 *  - Admin -> /admin/dashboard
 *  - Manager -> /manager/dashboard
 *  - Staff -> /staff/dashboard
 */
export function getDashboardPath(role?: string): string {
  if (!role) return "/citizen/dashboard";

  const normalized = role.toLowerCase().trim();
  switch (normalized) {
    case "admin":
      return "/admin/dashboard";
    case "department_manager":
    case "manager":
      return "/manager/dashboard";
    case "maintenance_staff":
    case "staff":
      return "/staff/dashboard";
    case "citizen":
    default:
      return "/citizen/dashboard";
  }
}

/**
 * Formats a user-friendly role label.
 */
export function getRoleLabel(role?: string): string {
  if (!role) return "Citizen";
  switch (role.toLowerCase().trim()) {
    case "admin":
      return "Administrator";
    case "department_manager":
      return "Department Manager";
    case "maintenance_staff":
      return "Maintenance Staff";
    case "citizen":
    default:
      return "Citizen";
  }
}

/**
 * Securely retrieves the token from client-side storage.
 * Never logs the token.
 */
export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Retrieves the stored user profile from client-side storage.
 */
export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

/**
 * Stores authentication credentials securely in browser storage.
 * Does not emit tokens to logs or console.
 */
export function setStoredAuth(token: string, user: User): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // Fail silently without exposing data
  }
}

/**
 * Removes stored authentication credentials.
 */
export function clearStoredAuth(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    // Fail silently
  }
}

/**
 * Authenticates a user against POST /api/auth/login.
 */
export async function loginUser(payload: LoginPayload): Promise<{
  user: User;
  token: string;
  redirectUrl: string;
}> {
  const endpoint = `${getApiBaseUrl()}/auth/login`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: payload.email.trim(),
        password: payload.password,
      }),
    });
  } catch {
    throw new Error(
      "Unable to reach CivicPulse server. Please verify the backend is running at http://localhost:5000."
    );
  }

  let json: AuthApiResponse;
  try {
    json = await response.json();
  } catch {
    throw new Error("Invalid response format received from authentication server.");
  }

  if (!response.ok || !json.success || !json.data?.token || !json.data?.user) {
    throw new Error(json.message || "Login failed. Please check your credentials.");
  }

  const { user, token } = json.data;
  setStoredAuth(token, user);
  const redirectUrl = getDashboardPath(user.role);

  return { user, token, redirectUrl };
}

/**
 * Registers a new citizen account against POST /api/auth/register.
 * Enforces citizen role only. Never allows role selection.
 */
export async function registerCitizen(payload: RegisterCitizenPayload): Promise<{
  user: User;
  token: string;
  redirectUrl: string;
}> {
  const endpoint = `${getApiBaseUrl()}/auth/register`;

  // Payload explicitly contains only Citizen fields
  const requestBody: Record<string, string | undefined> = {
    name: payload.name.trim(),
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
  };

  if (payload.phone?.trim()) {
    requestBody.phone = payload.phone.trim();
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
  } catch {
    throw new Error(
      "Unable to reach CivicPulse server. Please verify the backend is running at http://localhost:5000."
    );
  }

  let json: AuthApiResponse;
  try {
    json = await response.json();
  } catch {
    throw new Error("Invalid response format received from authentication server.");
  }

  if (!response.ok || !json.success || !json.data?.token || !json.data?.user) {
    throw new Error(json.message || "Registration failed. Please check your input.");
  }

  const { user, token } = json.data;
  setStoredAuth(token, user);
  const redirectUrl = getDashboardPath(user.role);

  return { user, token, redirectUrl };
}
