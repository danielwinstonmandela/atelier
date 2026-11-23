"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { acceptInvitation } from "@/lib/actions/wardrobes";

export function InvitationsPanel({
  invitations,
  email,
}: {
  invitations: { id: string; email: string; role: "editor" | "viewer"; status: string; created_at: string }[];
  email: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const visible = invitations.filter((invite) => invite.email.toLowerCase() === email.toLowerCase());

  return (
    <div className="max-w-2xl">
      <p className="eyebrow mb-3">Shared access</p>
      <h1 className="display mb-8 text-4xl sm:text-5xl">Invitations</h1>
      {visible.length === 0 ? (
        <p className="text-muted-foreground">You have no pending archive invitations.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {visible.map((invite) => (
            <li key={invite.id} className="flex items-center justify-between gap-4 px-4 py-4">
              <div>
                <p className="text-sm">Shared archive invitation</p>
                <p className="text-xs text-muted-foreground">{invite.role} access</p>
              </div>
              <Button
                disabled={pending}
                onClick={() => startTransition(async () => {
                  const result = await acceptInvitation(invite.id);
                  if (!result.ok) return void toast.error(result.error);
                  toast.success("You joined the wardrobe");
                  router.push("/");
                  router.refresh();
                })}
              >
                {pending ? <Loader2 className="animate-spin" /> : <Check />} Accept
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
