import type { Metadata } from "next";
import { OutfitBuilder } from "@/components/outfit-builder";
import { getWardrobe } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Studio" };
export const dynamic = "force-dynamic";

export default async function NewOutfitPage() {
  const supabase = await createClient();
  const wardrobe = await getWardrobe(supabase);
  return <OutfitBuilder wardrobe={wardrobe} />;
}
