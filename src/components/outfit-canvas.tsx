"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, FlipHorizontal2, BringToFront, SendToBack, Trash2 } from "lucide-react";
import type { ClothingItem, OutfitPlacement } from "@/lib/types";
import { Button } from "@/components/ui/button";

type Gesture =
  | { type: "move"; id: string; startX: number; startY: number; originX: number; originY: number }
  | { type: "resize"; id: string; startDistance: number; originScale: number }
  | { type: "rotate"; id: string; startAngle: number; originRotation: number };

export function OutfitCanvas({
  wardrobe,
  placements,
  setPlacements,
  commit,
  selectedId,
  setSelectedId,
  onDropItem,
}: {
  wardrobe: ClothingItem[];
  placements: OutfitPlacement[];
  setPlacements: (placements: OutfitPlacement[]) => void;
  commit: (placements: OutfitPlacement[]) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  onDropItem: (item: ClothingItem, x: number, y: number) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const beforeGesture = useRef<OutfitPlacement[] | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const point = (event: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0, angle: 0 };
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    return { x, y, angle: 0 };
  };

  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (!selectedId) return;
      const selected = placements.find((p) => p.id === selectedId);
      if (!selected) return;
      const step = event.shiftKey ? 0.02 : 0.005;
      let next: OutfitPlacement | null = null;
      if (event.key === "ArrowLeft") next = { ...selected, x: selected.x - step };
      if (event.key === "ArrowRight") next = { ...selected, x: selected.x + step };
      if (event.key === "ArrowUp") next = { ...selected, y: selected.y - step };
      if (event.key === "ArrowDown") next = { ...selected, y: selected.y + step };
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        commit(placements.filter((p) => p.id !== selectedId));
        setSelectedId(null);
        return;
      }
      if (event.key === "[") next = { ...selected, z_index: selected.z_index - 1 };
      if (event.key === "]") next = { ...selected, z_index: selected.z_index + 1 };
      if (next) {
        event.preventDefault();
        commit(placements.map((p) => p.id === selectedId ? next! : p));
      }
    }
    window.addEventListener("keydown", keydown);
    return () => window.addEventListener("keydown", keydown);
  }, [selectedId, placements, commit, setSelectedId]);

  function startMove(event: React.PointerEvent, placement: OutfitPlacement) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(placement.id);
    setDragId(placement.id);
    const p = point(event);
    beforeGesture.current = placements;
    gestureRef.current = {
      type: "move",
      id: placement.id,
      startX: p.x,
      startY: p.y,
      originX: placement.x,
      originY: placement.y,
    };
  }

  function onPointerMove(event: React.PointerEvent) {
    const gesture = gestureRef.current;
    if (!gesture || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    if (gesture.type === "move") {
      const p = point(event);
      const dx = p.x - gesture.startX;
      const dy = p.y - gesture.startY;
      setPlacements(placements.map((item) => {
        if (item.id !== gesture.id) return item;
        return {
          ...item,
          x: Math.max(0, Math.min(1, gesture.originX + dx)),
          y: Math.max(0, Math.min(1, gesture.originY + dy)),
        };
      }));
    }
  }

  function endGesture(event: React.PointerEvent) {
    if (gestureRef.current && beforeGesture.current) {
      commit(placements);
    }
    gestureRef.current = null;
    beforeGesture.current = null;
    setDragId(null);
  }

  function startResize(event: React.PointerEvent, placement: OutfitPlacement) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width * placement.x;
    const cy = rect.top + rect.height * placement.y;
    beforeGesture.current = placements;
    gestureRef.current = {
      type: "resize",
      id: placement.id,
      startDistance: Math.hypot(event.clientX - cx, event.clientY - cy),
      originScale: placement.scale,
    };
  }

  function resizeMove(event: React.PointerEvent) {
    const gesture = gestureRef.current;
    if (gesture?.type !== "resize" || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const selected = placements.find((p) => p.id === gesture.id);
    if (!selected) return;
    const cx = rect.left + rect.width * selected.x;
    const cy = rect.top + rect.height * selected.y;
    const distance = Math.hypot(event.clientX - cx, event.clientY - cy);
    const scale = Math.max(0.05, Math.min(2, gesture.originScale * (distance / Math.max(1, gesture.startDistance))));
    setPlacements(placements.map((p) => p.id === gesture.id ? { ...p, scale } : p));
  }

  function startRotate(event: React.PointerEvent, placement: OutfitPlacement) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    beforeGesture.current = placements;
    const cx = rect.left + rect.width * placement.x;
    const cy = rect.top + rect.height * placement.y;
    gestureRef.current = {
      type: "rotate",
      id: placement.id,
      startAngle: Math.atan2(event.clientY - cy, event.clientX - cx) * 180 / Math.PI,
      originRotation: placement.rotation,
    };
  }

  function rotateMove(event: React.PointerEvent) {
    const gesture = gestureRef.current;
    if (gesture?.type !== "rotate" || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const selected = placements.find((p) => p.id === gesture.id);
    if (!selected) return;
    const cx = rect.left + rect.width * selected.x;
    const cy = rect.top + rect.height * selected.y;
    const angle = Math.atan2(event.clientY - cy, event.clientX - cx) * 180 / Math.PI;
    const rotation = Math.max(-360, Math.min(360, gesture.originRotation + angle - gesture.startAngle));
    setPlacements(placements.map((p) => p.id === gesture.id ? { ...p, rotation } : p));
  }

  function updateSelected(update: (placement: OutfitPlacement) => OutfitPlacement) {
    if (!selectedId) return;
    const next = placements.map((p) => p.id === selectedId ? update(p) : p);
    commit(next);
  }

  const selected = placements.find((p) => p.id === selectedId);

  return (
    <div>
      {selected && (
        <div className="mb-2 flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-1">
          <Button variant="ghost" size="sm" onClick={() => updateSelected((p) => ({ ...p, z_index: p.z_index + 1 }))}><BringToFront className="size-4" /> Forward</Button>
          <Button variant="ghost" size="sm" onClick={() => updateSelected((p) => ({ ...p, z_index: p.z_index - 1 }))}><SendToBack className="size-4" /> Backward</Button>
          <Button variant="ghost" size="sm" onClick={() => updateSelected((p) => ({ ...p, flipped: !p.flipped }))}><FlipHorizontal2 className="size-4" /> Flip</Button>
          <Button variant="ghost" size="sm" onClick={() => updateSelected((p) => ({ ...p, id: crypto.randomUUID(), z_index: p.z_index + 1 }))}><Copy className="size-4" /> Duplicate</Button>
          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => {
            commit(placements.filter((p) => p.id !== selectedId));
            setSelectedId(null);
          }}><Trash2 className="size-4" /> Remove</Button>
        </div>
      )}
      <div
        ref={canvasRef}
        className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-border bg-card bg-[linear-gradient(to_right,hsl(var(--border)/0.25)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.25)_1px,transparent_1px)] bg-[size:10%_10%]"
        style={{ touchAction: "none" }}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) setSelectedId(null);
        }}
        onPointerMove={(event) => {
          if (gestureRef.current?.type === "move") onPointerMove(event);
          if (gestureRef.current?.type === "resize") resizeMove(event);
          if (gestureRef.current?.type === "rotate") rotateMove(event);
        }}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const id = event.dataTransfer.getData("application/x-wardrobe-item");
          const item = wardrobe.find((w) => w.id === id);
          if (!item || !canvasRef.current) return;
          const rect = canvasRef.current.getBoundingClientRect();
          onDropItem(item, (event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
        }}
      >
        {[...placements].sort((a, b) => a.z_index - b.z_index).map((placement) => {
          const imageUrl = placement.item?.displayUrl ?? placement.item?.thumbUrl;
          const selected = placement.id === selectedId;
          return (
            <div
              key={placement.id}
              className="absolute left-0 top-0"
              style={{
                left: `${placement.x * 100}%`,
                top: `${placement.y * 100}%`,
                width: `${placement.scale * 100}%`,
                zIndex: placement.z_index + 1,
                transform: `translate(-50%, -50%) rotate(${placement.rotation}deg) scaleX(${placement.flipped ? -1 : 1})`,
                transformOrigin: "center",
                touchAction: "none",
              }}
              onPointerDown={(event) => startMove(event, placement)}
            >
              {imageUrl && placement.item ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt={placement.item.name || "Archive item"} draggable={false} className="block h-auto w-full select-none object-contain" style={{ touchAction: "none" }} />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded border border-dashed border-destructive/60 bg-background/80 p-2 text-center text-[10px] text-muted-foreground">
                  No longer in archive
                </div>
              )}
              {selected && (
                <>
                  <div className="pointer-events-none absolute -inset-1 rounded-sm border border-foreground" />
                  <button
                    type="button"
                    aria-label="Resize piece"
                    className="absolute -bottom-5 -right-5 size-11 rounded-full border-2 border-background bg-foreground/80"
                    onPointerDown={(event) => startResize(event, placement)}
                  />
                  <button
                    type="button"
                    aria-label="Rotate piece"
                    className="absolute -top-10 left-1/2 size-11 -translate-x-1/2 rounded-full border-2 border-background bg-foreground/80"
                    onPointerDown={(event) => startRotate(event, placement)}
                  />
                </>
              )}
            </div>
          );
        })}
        {placements.length === 0 && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 text-center text-sm text-muted-foreground">Drag items here</p>
        )}
      </div>
    </div>
  );
}
