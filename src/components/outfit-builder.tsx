"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Loader2, Redo2, Save, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WardrobePanel } from "@/components/wardrobe-panel";
import { OutfitCanvas } from "@/components/outfit-canvas";
import { useCanvasHistory } from "@/components/use-canvas-history";
import { saveOutfit } from "@/lib/actions/outfits";
import type { ClothingItem, Outfit, OutfitPlacement } from "@/lib/types";

export function OutfitBuilder({ wardrobe, outfit }: { wardrobe: ClothingItem[]; outfit?: Outfit }) {
  const router = useRouter();
  const editing = Boolean(outfit);
  const initial = outfit?.placements ?? [];
  const history = useCanvasHistory(initial);
  const [name, setName] = useState(outfit?.name ?? "");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const baseline = useRef(JSON.stringify({ name: outfit?.name ?? "", placements: initial }));

  const dirty = JSON.stringify({ name, placements: history.placements }) !== baseline.current;

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  function addItem(item: ClothingItem, x = 0.5, y = 0.5) {
    const id = crypto.randomUUID();
    const next: OutfitPlacement[] = [
      ...history.placements,
      {
        id,
        clothing_item_id: item.id,
        category: item.category,
        item,
        missing: false,
        x,
        y,
        scale: 0.5,
        rotation: 0,
        z_index: history.placements.length,
        flipped: false,
      },
    ];
    history.commit(next);
    setSelectedId(id);
  }

  function save(asNew: boolean) {
    if (history.placements.length === 0) return void toast.error("Add at least one item before saving.");
    startTransition(async () => {
      const result = await saveOutfit({
        id: outfit?.id,
        asNew,
        name,
        placements: history.placements
          .filter((p) => p.clothing_item_id !== null)
          .map((p) => ({
            clothing_item_id: p.clothing_item_id,
            category: p.category,
            x: p.x,
            y: p.y,
            scale: p.scale,
            rotation: p.rotation,
            z_index: p.z_index,
            flipped: p.flipped,
          })),
      });
      if (!result.ok) return void toast.error(result.error);
      toast.success(asNew && editing ? "Saved as a new look" : editing ? "Look updated" : "Look recorded");
      baseline.current = JSON.stringify({ name, placements: history.placements });
      if (!editing || asNew) router.push(`/outfits/${result.data.id}`);
      else router.refresh();
    });
  }

  return (
    <div>
      {editing && (
        <Link href="/outfits" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> All looks
        </Link>
      )}
      <div className="mb-6">
        <p className="eyebrow mb-2">{editing ? "Editing look" : "Studio"}</p>
        <h1 className="display text-4xl sm:text-5xl">{editing ? name || "Untitled look" : "Compose a look"}</h1>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={history.undo} disabled={!history.canUndo}><Undo2 className="size-4" /> Undo</Button>
        <Button variant="outline" size="sm" onClick={history.redo} disabled={!history.canRedo}><Redo2 className="size-4" /> Redo</Button>
        <Button variant="ghost" size="sm" onClick={() => setClearOpen(true)} disabled={history.placements.length === 0}><Trash2 className="size-4" /> Clear</Button>
        <div className="min-w-48 flex-1 sm:max-w-xs">
          <label htmlFor="outfit-name" className="sr-only">Look name</label>
          <Input id="outfit-name" value={name} maxLength={120} placeholder="Look name" onChange={(event) => setName(event.target.value)} />
        </div>
        <Button onClick={() => save(false)} disabled={pending || history.placements.length === 0}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />} Save look
        </Button>
        {editing && (
          <Button variant="outline" onClick={() => save(true)} disabled={pending || history.placements.length === 0}>
            <Copy /> Save as new
          </Button>
        )}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(220px,280px)_minmax(320px,640px)] lg:justify-center">
        <WardrobePanel wardrobe={wardrobe} placements={history.placements} onAdd={addItem} />
        <OutfitCanvas
          wardrobe={wardrobe}
          placements={history.placements}
          setPlacements={history.setPlacements}
          commit={history.commit}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          onDropItem={addItem}
        />
      </div>

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Clear the canvas?</AlertDialogTitle>
          <AlertDialogDescription>This removes all items from this composition. You can undo it afterwards.</AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Keep items</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => {
              event.preventDefault();
              history.commit([]);
              setSelectedId(null);
              setClearOpen(false);
            }}>Clear canvas</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
