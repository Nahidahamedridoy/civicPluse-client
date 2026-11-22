"use client";

import React, { useSyncExternalStore } from "react";
import { Button } from "@heroui/react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../providers";

const emptySubscribe = () => () => {};

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isMounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  if (!isMounted) {
    return (
      <Button variant="ghost" isIconOnly size="sm" aria-label="Toggle theme">
        <Sun className="h-4 w-4 opacity-50" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      isIconOnly
      size="sm"
      onPress={toggleTheme}
      aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
      className="cursor-pointer transition-transform hover:scale-105"
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-4 w-4 text-warning" />
      ) : (
        <Moon className="h-4 w-4 text-civic-slate" />
      )}
    </Button>
  );
}
