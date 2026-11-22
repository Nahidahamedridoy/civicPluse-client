"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { RouterProvider } from "@heroui/react";
import { AuthProvider } from "@/context/auth-context";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const emptySubscribe = () => () => {};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a Providers wrapper");
  }
  return context;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const isMounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("civicpulse-theme") as Theme | null;
      if (saved === "light" || saved === "dark" || saved === "system") {
        return saved;
      }
    }
    return "system";
  });

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (!isMounted) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      const active = theme === "system" ? (mediaQuery.matches ? "dark" : "light") : theme;
      setResolvedTheme(active);

      const root = document.documentElement;
      if (active === "dark") {
        root.classList.add("dark");
        root.setAttribute("data-theme", "dark");
      } else {
        root.classList.remove("dark");
        root.setAttribute("data-theme", "light");
      }
    };

    applyTheme();

    if (theme === "system") {
      mediaQuery.addEventListener("change", applyTheme);
      return () => mediaQuery.removeEventListener("change", applyTheme);
    }
  }, [theme, isMounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("civicpulse-theme", newTheme);
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <RouterProvider navigate={(path) => startTransition(() => router.push(path))}>
      <ThemeContext.Provider
        value={{
          theme,
          resolvedTheme,
          setTheme,
          toggleTheme,
        }}
      >
        <AuthProvider>{children}</AuthProvider>
      </ThemeContext.Provider>
    </RouterProvider>
  );
}
