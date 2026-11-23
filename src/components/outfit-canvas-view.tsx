"use client";

import type { OutfitPlacement } from "@/lib/types";
import { cn } from "@/lib/utils";

export function OutfitCanvasView({
  placements,
  className,
  interactive = false,
}: {
  placements: OutfitPlacement[];
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-border bg-card",
        "bg-[linear-gradient(to_right,hsl(var(--border)/0.25)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.25)_1px,transparent_1px)]",
        "bg-[size:10%_10%]",
        className
      )}
      style={{ touchAction: interactive ? "none" : "auto" }}
    >
      {placements.map((placement) => {
        const width = `${placement.scale * 100}%`;
        const imageUrl = placement.item?.displayUrl ?? placement.item?.thumbUrl;
        return (
          <div
            key={placement.id}
            className="absolute left-0 top-0"
            style={{
              left: `${placement.x * 100}%`,
              top: `${placement.y * 100}%`,
              width,
              zIndex: placement.z_index + 1,
              transform: `translate(-50%, -50%) rotate(${placement.rotation}deg) scaleX(${placement.flipped ? -1 : 1})`,
              transformOrigin: "center",
            }}
          >
            {placement.item && imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={placement.item.name || "Archive item"}
                draggable={false}
                className="block h-auto w-full select-none object-contain"
                style={{ touchAction: "none" }}
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center rounded border border-dashed border-destructive/60 bg-background/80 p-2 text-center text-[10px] text-muted-foreground">
                No longer in archive
              </div>
            )}
          </div>
        );
      })}
      {placements.length === 0 && (
        <p className="absolute inset-0 flex items-center justify-center px-8 text-center text-sm text-muted-foreground">
          Drag items here
        </p>
      )}
    </div>
  );
}
