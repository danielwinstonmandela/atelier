"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";
import type { Category, ClothingItem } from "@/lib/types";

const SECTIONS: { category: Category; label: string }[] = [
  { category: "Top", label: "Top" },
  { category: "Bottom", label: "Bottom" },
  { category: "Shoes", label: "Shoes" },
  { category: "Other", label: "Accessories" },
];

export function WardrobePanel({
  wardrobe,
  placements,
  onAdd,
}: {
  wardrobe: ClothingItem[];
  placements: { clothing_item_id: string | null }[];
  onAdd: (item: ClothingItem, x?: number, y?: number) => void;
}) {
  const [open, setOpen] = useState<Record<Category, boolean>>({
    Top: true,
    Bottom: true,
    Shoes: true,
    Other: true,
  });
  const used = useMemo(
    () => new Set(placements.map((p) => p.clothing_item_id).filter(Boolean)),
    [placements]
  );

  return (
    <aside className="rounded-lg border border-border bg-card lg:sticky lg:top-24 lg:max-h-[calc(100vh-7.5rem)] lg:overflow-y-auto">
      <div className="border-b border-border px-4 py-3">
        <p className="eyebrow">Archive</p>
      </div>
      {SECTIONS.map(({ category, label }) => {
        const items = wardrobe.filter((item) => item.category === category);
        return (
          <section key={category} className="border-b border-border last:border-b-0">
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-sm"
              onClick={() => setOpen((s) => ({ ...s, [category]: !s[category] }))}
              aria-expanded={open[category]}
            >
              <span>{label} <span className="ml-1 text-muted-foreground">({items.length})</span></span>
              <ChevronDown className={`size-4 transition-transform ${open[category] ? "rotate-180" : ""}`} />
            </button>
            {open[category] && (
              items.length ? (
                <ul className="grid grid-cols-3 gap-2 px-3 pb-3 sm:grid-cols-4 lg:grid-cols-3">
                  {items.map((item) => (
                    <li key={item.id} className="relative">
                      <button
                        type="button"
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData("application/x-wardrobe-item", item.id);
                          event.dataTransfer.effectAllowed = "copy";
                        }}
                        onClick={() => onAdd(item)}
                        title={item.name || "Untitled"}
                        className="group relative block w-full overflow-hidden rounded-md border border-transparent text-left hover:border-foreground/40"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.thumbUrl ?? item.displayUrl ?? ""}
                          alt=""
                          draggable={false}
                          className="aspect-square w-full object-cover"
                        />
                        {used.has(item.id) && (
                          <span className="absolute right-1 top-1 rounded-full bg-background/90 px-1.5 py-0.5 text-[9px] shadow-sm">On canvas</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 pb-4 text-xs text-muted-foreground">
                  No items here.{" "}
                  <Link href="/add" className="inline-flex items-center gap-1 underline underline-offset-2">
                    <Plus className="size-3" /> Add
                  </Link>
                </div>
              )
            )}
          </section>
        );
      })}
    </aside>
  );
}
