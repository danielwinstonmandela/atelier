"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClothingItem } from "@/lib/types";

/**
 * Consistent image tile for a clothing item. Cut-outs (background removed) are contained with
 * breathing room; plain photos fill the tile. Handles loading and broken-image states.
 */
export function ItemImage({
  item,
  variant = "thumb",
  className,
  src,
}: {
  item: Pick<ClothingItem, "name" | "category" | "thumbUrl" | "displayUrl" | "processed_image_url">;
  variant?: "thumb" | "full";
  className?: string;
  /** Override the URL (e.g. to show the original instead of the cut-out) */
  src?: string | null;
}) {
  const url = src ?? (variant === "thumb" ? item.thumbUrl : item.displayUrl);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const cutout = Boolean(item.processed_image_url) && !src;

  return (
    <div className={cn("tile", className)}>
      {state === "loading" && url && <div className="absolute inset-0 animate-pulse bg-muted" />}
      {url && state !== "error" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={item.name || `${item.category} item`}
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={() => setState("ready")}
          onError={() => setState("error")}
          className={cn(
            "absolute inset-0 size-full transition-opacity duration-300",
            cutout ? "object-contain p-[8%]" : "object-cover",
            state === "ready" ? "opacity-100" : "opacity-0"
          )}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <ImageOff className="size-5" />
          <span className="text-xs">Photo unavailable</span>
        </div>
      )}
    </div>
  );
}
