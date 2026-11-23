"use client";

import { useCallback, useRef, useState } from "react";
import type { OutfitPlacement } from "@/lib/types";

export function useCanvasHistory(initial: OutfitPlacement[]) {
  const [placements, setPlacements] = useState(initial);
  const undoStack = useRef<OutfitPlacement[][]>([]);
  const redoStack = useRef<OutfitPlacement[][]>([]);

  const commit = useCallback((next: OutfitPlacement[]) => {
    undoStack.current = [...undoStack.current.slice(-29), placements];
    redoStack.current = [];
    setPlacements(next);
  }, [placements]);

  const replaceLive = useCallback((next: OutfitPlacement[]) => setPlacements(next), []);

  const undo = useCallback(() => {
    const previous = undoStack.current.pop();
    if (!previous) return;
    redoStack.current = [...redoStack.current, placements];
    setPlacements(previous);
  }, [placements]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current = [...undoStack.current.slice(-29), placements];
    setPlacements(next);
  }, [placements]);

  return {
    placements,
    setPlacements: replaceLive,
    commit,
    undo,
    redo,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
  };
}
