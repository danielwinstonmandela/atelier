import type { Metadata } from "next";
import { WardrobeGallery } from "@/components/wardrobe-gallery";
import { getWardrobe } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { getWardrobeContext } from "@/lib/data";

export const metadata: Metadata = { title: "Archive" };
export const dynamic = "force-dynamic";

export default async function WardrobePage() {
  const supabase = await createClient();
  const items = await getWardrobe(supabase);
  const wardrobe = await getWardrobeContext(supabase);
  return <WardrobeGallery items={items} canEdit={wardrobe?.role === "owner"} />;
}
