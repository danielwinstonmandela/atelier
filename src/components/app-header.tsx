"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/actions/auth";
import type { WardrobeRole } from "@/lib/data";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/", label: "Archive", match: (p: string) => p === "/" || p.startsWith("/add") },
  { href: "/outfits/new", label: "Studio", match: (p: string) => p.startsWith("/outfits/new") },
  {
    href: "/outfits",
    label: "Looks",
    match: (p: string) => p.startsWith("/outfits") && !p.startsWith("/outfits/new"),
  },
  { href: "/invitations", label: "Invites", match: (p: string) => p.startsWith("/invitations") },
];

export function AppHeader({
  email,
  wardrobeName,
  role,
  isOwner,
}: {
  email: string;
  wardrobeName?: string;
  role?: WardrobeRole;
  isOwner: boolean;
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="display text-2xl">
          ATELIER
        </Link>
        {wardrobeName && (
          <Link href={isOwner ? "/sharing" : "/"} className="hidden text-xs text-muted-foreground hover:text-foreground sm:block">
            {wardrobeName}{role && role !== "owner" ? ` · ${role}` : ""}
          </Link>
        )}

        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm transition-colors sm:px-4",
                  active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center">
          <ThemeToggle compact />
          <form action={signOut}>
            <button
              type="submit"
              title={`Sign out (${email})`}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="size-4" />
              <span className="sr-only">Sign out</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
