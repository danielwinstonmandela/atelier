"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  if (!mounted) return <span className={cn("inline-block rounded-full", compact ? "size-10" : "size-9")} />;

  const choices = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Night", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ] as const;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Theme and background settings"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        {theme === "light" ? <Sun className="size-4" /> : theme === "dark" ? <Moon className="size-4" /> : <Monitor className="size-4" />}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-56 rounded-lg border border-border bg-card p-2 shadow-none">
          <p className="px-2 pb-2 pt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Appearance</p>
          {choices.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
                theme === value ? "bg-foreground text-background" : "text-foreground hover:bg-muted"
              )}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
