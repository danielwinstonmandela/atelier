"use client";

import { cn } from "@/lib/utils";
import { CATEGORIES, CATEGORY_HINTS, type Category } from "@/lib/types";

export function CategoryPicker({
  value,
  onChange,
  compact,
}: {
  value: Category | null;
  onChange: (c: Category) => void;
  compact?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Category" className={cn("grid gap-2", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4")}>
      {CATEGORIES.map((c) => {
        const selected = value === c;
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(c)}
            className={cn(
              "rounded-lg border px-3 py-2.5 text-left transition-colors",
              selected ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:border-foreground/40"
            )}
          >
            <span className="block text-sm font-medium">{c}</span>
            {!compact && (
              <span className={cn("mt-0.5 block text-[11px] leading-snug", selected ? "text-background/70" : "text-muted-foreground")}>
                {CATEGORY_HINTS[c]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
