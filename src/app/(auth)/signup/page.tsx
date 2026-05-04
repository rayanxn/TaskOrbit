"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/actions/auth";
import type { ActionResponse } from "@/lib/types";
import { GuestModeChooser } from "../guest-mode-chooser";

function SignUpPageContent() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const [state, formAction, pending] = useActionState<
    ActionResponse | null,
    FormData
  >(async (_prev, formData) => {
    return await signUp(formData);
  }, null);

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-primary rounded-lg w-10 h-10 flex items-center justify-center text-background font-bold">
          F
        </div>
        <span className="font-medium text-text text-lg">Flow</span>
      </div>

      {/* Heading */}
      <h1 className="text-3xl font-serif text-text mb-2">
        Create your account
      </h1>
      <p className="text-text-secondary mb-8">
        Start managing projects in minutes
      </p>

      {/* Error message */}
      {state?.error && (
        <div className="bg-danger-light border border-danger/20 text-danger rounded-lg px-4 py-3 text-sm mb-6">
          {state.error}
        </div>
      )}

      {/* Form */}
      <form action={formAction} className="space-y-5">
        <input type="hidden" name="next" value={nextPath ?? ""} />
        <div className="space-y-2">
          <label
            htmlFor="fullName"
            className="uppercase tracking-wider text-xs font-medium text-text-secondary"
          >
            Full Name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            placeholder="Your full name"
            required
            className="flex h-12 w-full rounded-lg border border-border bg-surface px-4 text-sm text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/10 focus-visible:border-border-strong transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="email"
            className="uppercase tracking-wider text-xs font-medium text-text-secondary"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@company.com"
            required
            className="flex h-12 w-full rounded-lg border border-border bg-surface px-4 text-sm text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/10 focus-visible:border-border-strong transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="uppercase tracking-wider text-xs font-medium text-text-secondary"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="8+ characters"
            required
            minLength={8}
            className="flex h-12 w-full rounded-lg border border-border bg-surface px-4 text-sm text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/10 focus-visible:border-border-strong transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="bg-primary text-background w-full h-12 rounded-lg font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          {pending ? "Creating Account..." : "Create Account"}
        </button>
      </form>

      <GuestModeChooser disabled={pending} />

      {/* Footer link */}
      <p className="text-center text-sm text-text-secondary mt-8">
        Already have an account?{" "}
        <Link
          href={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"}
          className="text-text font-medium hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md" />}>
      <SignUpPageContent />
    </Suspense>
  );
}
