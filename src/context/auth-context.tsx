"use client";

import React, {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
} from "react";
import {
  User,
  LoginPayload,
  RegisterCitizenPayload,
  getStoredUser,
  getStoredToken,
  clearStoredAuth,
  loginUser as apiLoginUser,
  registerCitizen as apiRegisterCitizen,
} from "@/lib/auth";

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: string | null;
  isAuthenticated: boolean;
  isMounted: boolean;
  login: (payload: LoginPayload) => Promise<{ user: User; redirectUrl: string }>;
  register: (payload: RegisterCitizenPayload) => Promise<{ user: User; redirectUrl: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const emptySubscribe = () => () => {};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const isMounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== "undefined") {
      return getStoredUser();
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return getStoredToken();
    }
    return null;
  });

  const login = async (payload: LoginPayload) => {
    const result = await apiLoginUser(payload);
    setUser(result.user);
    setToken(result.token);
    return { user: result.user, redirectUrl: result.redirectUrl };
  };

  const register = async (payload: RegisterCitizenPayload) => {
    const result = await apiRegisterCitizen(payload);
    setUser(result.user);
    setToken(result.token);
    return { user: result.user, redirectUrl: result.redirectUrl };
  };

  const logout = () => {
    clearStoredAuth();
    setUser(null);
    setToken(null);
  };

  const isAuthenticated = Boolean(isMounted && token && user);
  const role = user?.role || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isAuthenticated,
        isMounted,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
