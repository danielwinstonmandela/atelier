import type { Metadata } from "next";
import { OutfitGallery } from "@/components/outfit-gallery";
import { getOutfits } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Looks" };
export const dynamic = "force-dynamic";

export default async function SavedOutfitsPage() {
  const supabase = await createClient();
  const outfits = await getOutfits(supabase);
  return <OutfitGallery outfits={outfits} />;
}
