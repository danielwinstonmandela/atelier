/**
 * Categories are data, not a database enum, so new ones can be added by
 * extending this list without a migration.
 */
export const CATEGORIES = ["Top", "Bottom", "Shoes", "Other"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_HINTS: Record<Category, string> = {
  Top: "Shirts, T-shirts, polos, sweaters",
  Bottom: "Trousers, jeans, shorts",
  Shoes: "Sneakers, loafers, boots",
  Other: "Accessories, jackets, layers",
};

/** Slots shown in the outfit builder. `required` slots are the default Top/Bottom/Shoes trio. */
export const OUTFIT_SLOTS: { category: Category; label: string; optional: boolean }[] = [
  { category: "Top", label: "Top", optional: false },
  { category: "Bottom", label: "Bottom", optional: false },
  { category: "Shoes", label: "Shoes", optional: false },
  { category: "Other", label: "Extra", optional: true },
];

export function isCategory(v: unknown): v is Category {
  return typeof v === "string" && (CATEGORIES as readonly string[]).includes(v);
}

/** Row as stored in the database. Image columns hold storage object paths in the private bucket. */
export interface ClothingItemRow {
  id: string;
  user_id: string;
  wardrobe_id: string;
  name: string | null;
  category: Category;
  original_image_url: string;
  processed_image_url: string | null;
  created_at: string;
  updated_at: string;
}

/** Item as the UI consumes it: storage paths resolved into short-lived signed URLs. */
export interface ClothingItem extends ClothingItemRow {
  /** Best image for display (processed cut-out if present, else original) at full size */
  displayUrl: string | null;
  /** Small variant for grids; falls back to displayUrl */
  thumbUrl: string | null;
  originalUrl: string | null;
}

export interface OutfitRow {
  id: string;
  user_id: string;
  wardrobe_id: string;
  created_by: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutfitItemRow {
  id: string;
  outfit_id: string;
  clothing_item_id: string | null;
  slot_category: Category;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  z_index: number;
  flipped: boolean;
}

export interface OutfitPlacement {
  id: string;
  clothing_item_id: string | null;
  category: Category;
  item: ClothingItem | null;
  missing: boolean;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  z_index: number;
  flipped: boolean;
}

export interface Outfit extends OutfitRow {
  placements: OutfitPlacement[];
}

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024; // raw file picked by the user
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export const BUCKET = "wardrobe";
