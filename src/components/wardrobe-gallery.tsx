"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItemImage } from "@/components/item-tile";
import { ItemDialog } from "@/components/item-dialog";
import { CATEGORIES, type Category, type ClothingItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export function WardrobeGallery({ items, canEdit }: { items: ClothingItem[]; canEdit: boolean }) {
  const [filter, setFilter] = useState<Category | "All">("All");
  const [openId, setOpenId] = useState<string | null>(null);

  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, items.filter((i) => i.category === c).length]));
  const visible = filter === "All" ? items : items.filter((i) => i.category === filter);
  // Looked up from live props so edits/deletes refresh the open dialog correctly
  const openItem = items.find((i) => i.id === openId) ?? null;

  return (
    <>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow mb-3">Archive</p>
          <h1 className="display text-4xl sm:text-5xl">
            {items.length === 0 ? "An empty archive" : `${items.length} ${items.length === 1 ? "item" : "items"}`}
          </h1>
        </div>
        {canEdit && <Button asChild size="lg">
          <Link href="/add">
            <Plus /> Add item
          </Link>
        </Button>}
      </div>

      {items.length > 0 && (
        <div role="tablist" aria-label="Filter by category" className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {(["All", ...CATEGORIES] as const).map((c) => {
            const active = filter === c;
            const count = c === "All" ? items.length : counts[c];
            return (
              <button
                key={c}
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(c)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors",
                  active ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                )}
              >
                {c} <span className={cn("ml-1 text-xs", active ? "text-background/60" : "text-muted-foreground/70")}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState canEdit={canEdit} />
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-20 text-center">
          <p className="display text-2xl">Nothing in {filter} yet</p>
          <p className="mt-2 text-sm text-muted-foreground">Add an item and it will appear here.</p>
          {canEdit && <Button asChild variant="outline" className="mt-6">
            <Link href="/add">Record {filter === "Other" ? "an essential" : `a ${String(filter).toLowerCase()}`}</Link>
          </Button>}
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
          {visible.map((item, i) => (
            <li key={item.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
              <button type="button" onClick={() => setOpenId(item.id)} className="group block w-full text-left">
                <ItemImage item={item} className="aspect-[4/5] w-full transition-transform duration-500 group-hover:scale-[1.015]" />
                <p className="mt-3 truncate text-sm">{item.name || <span className="text-muted-foreground">Untitled</span>}</p>
                <p className="eyebrow mt-0.5">{item.category}</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      <ItemDialog item={openItem} canEdit={canEdit} onClose={() => setOpenId(null)} />
    </>
  );
}

function EmptyState({ canEdit }: { canEdit: boolean }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-muted">
        <Shirt className="size-7 text-muted-foreground" strokeWidth={1.25} />
      </div>
      <h2 className="display text-3xl">Begin the archive</h2>
      <p className="mt-3 text-muted-foreground">
        Photograph a shirt, a pair of shoes — whatever you reach for first. Your archive begins here.
      </p>
      {canEdit ? <Button asChild size="lg" className="mt-8">
        <Link href="/add">
          <Plus /> Add your first item
        </Link>
      </Button> : <p className="mt-8 text-sm text-muted-foreground">The owner manages this archive.</p>}
    </div>
  );
}
