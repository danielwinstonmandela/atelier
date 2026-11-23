import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InvitationsPanel } from "@/components/invitations-panel";

export const metadata: Metadata = { title: "Invitations" };

export default async function InvitationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: invitations } = await supabase
    .from("wardrobe_invitations")
    .select("id, email, role, status, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (
    <InvitationsPanel
      invitations={(invitations ?? []) as { id: string; email: string; role: "editor" | "viewer"; status: string; created_at: string }[]}
      email={user.email ?? ""}
    />
  );
}
