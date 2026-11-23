"use client";

import { useState, useTransition } from "react";
import { Loader2, Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inviteMember, removeMember, revokeInvitation } from "@/lib/actions/wardrobes";

export function SharingPanel({
  members,
  invitations,
}: {
  members: { user_id: string; role: "editor" | "viewer"; created_at: string }[];
  invitations: { id: string; email: string; role: "editor" | "viewer"; status: string; created_at: string }[];
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [pending, startTransition] = useTransition();

  function invite() {
    startTransition(async () => {
      const result = await inviteMember(email, role);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Invitation added");
      setEmail("");
      window.location.reload();
    });
  }

  return (
    <div className="max-w-2xl">
      <p className="eyebrow mb-3">Shared wardrobe</p>
      <h1 className="display mb-8 text-4xl sm:text-5xl">Invite a collaborator</h1>

      <div className="mb-10 rounded-lg border border-border p-5">
        <h2 className="display mb-4 text-2xl">New invitation</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="friend@example.com" />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "editor" | "viewer")}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="editor">Editor — compose looks</option>
            <option value="viewer">Viewer — view only</option>
          </select>
          <Button onClick={invite} disabled={pending || !email.trim()}>
            {pending ? <Loader2 className="animate-spin" /> : <Mail />} Invite
          </Button>
        </div>
      </div>

      {invitations.length > 0 && (
        <section className="mb-8">
          <h2 className="eyebrow mb-3">Invitations</h2>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {invitations.map((invite) => (
              <li key={invite.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div><p className="text-sm">{invite.email}</p><p className="text-xs text-muted-foreground">{invite.role} · {invite.status}</p></div>
                {invite.status === "pending" && (
                  <Button variant="ghost" size="sm" onClick={() => startTransition(async () => {
                    const result = await revokeInvitation(invite.id);
                    if (result.ok) window.location.reload();
                    else toast.error(result.error);
                  })}><Trash2 className="size-4" /> Revoke</Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {members.length > 0 && (
        <section>
          <h2 className="eyebrow mb-3">Members</h2>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {members.map((member) => (
              <li key={member.user_id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div><p className="text-sm">{member.user_id}</p><p className="text-xs text-muted-foreground">{member.role}</p></div>
                <Button variant="ghost" size="sm" onClick={() => startTransition(async () => {
                  const result = await removeMember(member.user_id);
                  if (result.ok) window.location.reload();
                  else toast.error(result.error);
                })}><Trash2 className="size-4" /> Remove</Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
