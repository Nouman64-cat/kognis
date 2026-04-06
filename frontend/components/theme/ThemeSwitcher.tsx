"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import type { ThemePreference } from "./ThemeProvider";
import { useTheme } from "./ThemeProvider";

const OPTIONS: { value: ThemePreference; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "Light theme" },
  { value: "dark", icon: Moon, label: "Dark theme" },
  { value: "system", icon: Laptop, label: "Use system theme" },
];

type Variant = "sidebar" | "compact";

export function ThemeSwitcher({ variant = "sidebar" }: { variant?: Variant }) {
  const { preference, setPreference } = useTheme();

  if (variant === "compact") {
    return (
      <div
        className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100/80 p-0.5 dark:border-zinc-600 dark:bg-zinc-800/80"
        role="group"
        aria-label="Theme"
      >
        {OPTIONS.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            type="button"
            title={label}
            aria-pressed={preference === value}
            onClick={() => setPreference(value)}
            className={`rounded-md p-2 transition ${
              preference === value
                ? "bg-white text-amber-600 shadow-sm dark:bg-zinc-700 dark:text-amber-400"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span className="sr-only">{label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="px-3 pb-1">
      <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        Theme
      </p>
      <div
        className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-700 dark:bg-zinc-950/80"
        role="group"
        aria-label="Theme"
      >
        {OPTIONS.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            type="button"
            title={label}
            aria-pressed={preference === value}
            onClick={() => setPreference(value)}
            className={`flex flex-1 items-center justify-center rounded-md py-2 transition ${
              preference === value
                ? "bg-white text-amber-600 shadow-sm dark:bg-zinc-800 dark:text-amber-400"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span className="sr-only">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
