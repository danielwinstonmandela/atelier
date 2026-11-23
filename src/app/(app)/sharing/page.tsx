import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureOwnWardrobe } from "@/lib/data";
import { SharingPanel } from "@/components/sharing-panel";

export const metadata: Metadata = { title: "Share archive" };

export default async function SharingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const wardrobe = await ensureOwnWardrobe(supabase, user.id);
  if (wardrobe.role !== "owner") redirect("/");

  const [{ data: members }, { data: invitations }] = await Promise.all([
    supabase
      .from("wardrobe_members")
      .select("user_id, role, created_at")
      .eq("wardrobe_id", wardrobe.id),
    supabase
      .from("wardrobe_invitations")
      .select("id, email, role, status, created_at")
      .eq("wardrobe_id", wardrobe.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <SharingPanel
      members={(members ?? []) as { user_id: string; role: "editor" | "viewer"; created_at: string }[]}
      invitations={(invitations ?? []) as { id: string; email: string; role: "editor" | "viewer"; status: string; created_at: string }[]}
    />
  );
}
