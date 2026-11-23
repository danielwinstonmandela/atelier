"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ItemImage } from "@/components/item-tile";
import { CategoryPicker } from "@/components/category-picker";
import { deleteItem, updateItem } from "@/lib/actions/items";
import { cn } from "@/lib/utils";
import type { Category, ClothingItem } from "@/lib/types";

export function ItemDialog({ item, canEdit, onClose }: { item: ClothingItem | null; canEdit: boolean; onClose: () => void }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("Top");
  const [showOriginal, setShowOriginal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  // Reset local state whenever a different item is opened
  useEffect(() => {
    if (item) {
      setEditing(false);
      setName(item.name ?? "");
      setCategory(item.category);
      setShowOriginal(false);
      setConfirmDelete(false);
    }
  }, [item]);

  const hasCutout = Boolean(item?.processed_image_url);

  function save() {
    if (!item) return;
    startTransition(async () => {
      const res = await updateItem(item.id, { name, category });
      if (!res.ok) return void toast.error(res.error);
      toast.success("Changes saved");
      setEditing(false);
      router.refresh();
      onClose();
    });
  }

  function remove() {
    if (!item) return;
    startTransition(async () => {
      const res = await deleteItem(item.id);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Removed from the archive");
      setConfirmDelete(false);
      router.refresh();
      onClose();
    });
  }

  return (
    <>
      <Dialog open={Boolean(item)} onOpenChange={(open) => !open && !pending && onClose()}>
        <DialogContent className="max-w-3xl">
          {item && (
            <div className="grid gap-6 sm:grid-cols-[1.1fr_1fr] sm:gap-8">
              <div>
                <ItemImage
                  item={item}
                  variant="full"
                  src={showOriginal ? item.originalUrl : undefined}
                  className="aspect-[4/5] w-full"
                />
                {hasCutout && (
                  <div className="mt-3 flex justify-center gap-1 rounded-full bg-muted p-1 text-xs">
                    {[
                      { label: "Cut-out", value: false },
                      { label: "Original", value: true },
                    ].map((o) => (
                      <button
                        key={o.label}
                        type="button"
                        onClick={() => setShowOriginal(o.value)}
                        className={cn(
                          "flex-1 rounded-full px-3 py-1.5 transition-colors",
                          showOriginal === o.value ? "bg-background shadow-sm" : "text-muted-foreground"
                        )}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col">
                <p className="eyebrow mb-2">{item.category}</p>
                {editing ? (
                  <>
                    <DialogTitle className="sr-only">Edit item</DialogTitle>
                    <DialogDescription className="sr-only">Change this item's name or category.</DialogDescription>
                    <div className="space-y-5">
                      <div className="space-y-1.5">
                        <label htmlFor="item-name" className="eyebrow">
                          Name
                        </label>
                        <Input
                          id="item-name"
                          value={name}
                          maxLength={120}
                          placeholder="Optional"
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <span className="eyebrow">Category</span>
                        <CategoryPicker value={category} onChange={setCategory} compact />
                      </div>
                    </div>
                    <div className="mt-auto flex gap-2 pt-8">
                      <Button onClick={save} disabled={pending} className="flex-1">
                        {pending && <Loader2 className="animate-spin" />}
                        Save changes
                      </Button>
                      <Button variant="outline" onClick={() => setEditing(false)} disabled={pending}>
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <DialogTitle>{item.name || `Untitled ${item.category.toLowerCase()}`}</DialogTitle>
                    <DialogDescription className="mt-2">
                      Added{" "}
                      {new Date(item.created_at).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                      {hasCutout ? " · background removed" : ""}
                    </DialogDescription>
                    {canEdit && <div className="mt-auto flex gap-2 pt-8">
                      <Button variant="outline" className="flex-1" onClick={() => setEditing(true)}>
                        <Pencil /> Edit
                      </Button>
                      <Button variant="ghost" className="text-destructive" onClick={() => setConfirmDelete(true)}>
                        <Trash2 /> Delete
                      </Button>
                    </div>}
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={(o) => !pending && setConfirmDelete(o)}>
        <AlertDialogContent>
          <div className="space-y-2">
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription>
              The photos will be permanently removed. Saved looks that include it will keep their other items and show
              this position as empty.
            </AlertDialogDescription>
          </div>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel disabled={pending}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                remove();
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
