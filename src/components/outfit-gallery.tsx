"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Layers, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/dialog";
import { deleteOutfit } from "@/lib/actions/outfits";
import type { Outfit } from "@/lib/types";
import { OutfitCanvasView } from "@/components/outfit-canvas-view";

function OutfitThumb({ outfit }: { outfit: Outfit }) {
  return <OutfitCanvasView placements={outfit.placements} className="rounded-lg" />;
}

export function OutfitGallery({ outfits }: { outfits: Outfit[] }) {
  const router = useRouter();
  const [toDelete, setToDelete] = useState<Outfit | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    if (!toDelete) return;
    startTransition(async () => {
      const res = await deleteOutfit(toDelete.id);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Look deleted");
      setToDelete(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow mb-3">Looks</p>
          <h1 className="display text-4xl sm:text-5xl">
            {outfits.length === 0 ? "No looks yet" : `${outfits.length} ${outfits.length === 1 ? "look" : "looks"}`}
          </h1>
        </div>
        <Button asChild size="lg">
          <Link href="/outfits/new">
            <Plus /> New look
          </Link>
        </Button>
      </div>

      {outfits.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
          <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-muted">
            <Layers className="size-7 text-muted-foreground" strokeWidth={1.25} />
          </div>
          <h2 className="display text-3xl">Compositions worth keeping</h2>
          <p className="mt-3 text-muted-foreground">Build a look and record it here.</p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/outfits/new">Create your first look</Link>
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
          {outfits.map((outfit, i) => (
            <li key={outfit.id} className="group relative animate-fade-up" style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
              <Link href={`/outfits/${outfit.id}`} className="block">
                <OutfitThumb outfit={outfit} />
                <p className="mt-3 truncate text-sm">{outfit.name || <span className="text-muted-foreground">Untitled look</span>}</p>
                <p className="eyebrow mt-0.5">
                  {outfit.placements.length} {outfit.placements.length === 1 ? "item" : "items"} ·{" "}
                  {new Date(outfit.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                </p>
              </Link>
              <button
                type="button"
                onClick={() => setToDelete(outfit)}
                aria-label={`Delete ${outfit.name || "look"}`}
                className="absolute right-2 top-2 rounded-full bg-background/90 p-2 text-muted-foreground opacity-100 shadow-sm transition-opacity hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={Boolean(toDelete)} onOpenChange={(o) => !pending && !o && setToDelete(null)}>
        <AlertDialogContent>
          <div className="space-y-2">
            <AlertDialogTitle>Delete this look?</AlertDialogTitle>
            <AlertDialogDescription>
              Only the recorded composition is removed — the items stay in the archive.
            </AlertDialogDescription>
          </div>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel disabled={pending}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              {pending && <Loader2 className="animate-spin" />}
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
