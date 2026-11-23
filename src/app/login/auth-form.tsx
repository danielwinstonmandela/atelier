"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn, signUp, type AuthState } from "@/lib/actions/auth";

const initial: AuthState = {};

export function AuthForm({ callbackError }: { callbackError?: boolean }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [state, formAction, pending] = useActionState(mode === "signin" ? signIn : signUp, initial);

  return (
    <>
      <h2 className="display text-4xl">{mode === "signin" ? "Welcome back" : "Create your archive"}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === "signin" ? "Sign in to open your archive." : "An email and a password is all it takes."}
      </p>

      <form action={formAction} className="mt-8 space-y-4" key={mode}>
        <div className="space-y-1.5">
          <label htmlFor="email" className="eyebrow">
            Email
          </label>
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="eyebrow">
            Password
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            required
            minLength={8}
            placeholder="At least 8 characters"
          />
        </div>

        <div aria-live="polite" className="min-h-5 text-sm">
          {state.error && <p className="text-destructive">{state.error}</p>}
          {state.message && <p className="text-foreground">{state.message}</p>}
          {!state.error && !state.message && callbackError && (
            <p className="text-destructive">That confirmation link has expired. Please sign in or sign up again.</p>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
        <button
          type="button"
          className="text-foreground underline underline-offset-4"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </>
  );
}
