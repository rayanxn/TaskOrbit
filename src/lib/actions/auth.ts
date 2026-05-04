"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResponse } from "@/lib/types";
import {
  cloneGuestWorkspace,
  createFreshGuestWorkspace,
} from "@/lib/guest/workspace-clone";
import { buildAuthRedirectUrl } from "@/lib/utils/redirect-path";
import {
  resolvePostAuthRedirect,
} from "@/lib/utils/auth-redirect";

export async function signUp(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();

  const fullName = formData.get("fullName") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const nextPath = formData.get("next") as string | null;

  if (!email || !password || !fullName) {
    return { error: "All fields are required" };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect(await resolvePostAuthRedirect(nextPath));
}

export async function signIn(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const nextPath = formData.get("next") as string | null;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect(await resolvePostAuthRedirect(nextPath));
}

type GuestMode = "demo" | "fresh";

function getGuestMode(formData?: FormData): GuestMode {
  return formData?.get("mode") === "fresh" ? "fresh" : "demo";
}

export async function continueAsGuest(formData?: FormData): Promise<ActionResponse> {
  const supabase = await createClient();
  const mode = getGuestMode(formData);

  const { data, error } = await supabase.auth.signInAnonymously({
    options: {
      data: { full_name: "Guest User" },
    },
  });

  if (error || !data.user) {
    return {
      error:
        error?.message ??
        "Unable to start guest mode. Please try again in a moment.",
    };
  }

  let redirectPath: string;

  try {
    if (mode === "fresh") {
      const { workspace } = await createFreshGuestWorkspace({
        guestUserId: data.user.id,
      });
      redirectPath = `/${workspace.slug}/projects`;
    } else {
      const { workspace } = await cloneGuestWorkspace({
        guestUserId: data.user.id,
      });
      redirectPath = `/${workspace.slug}/dashboard`;
    }
  } catch {
    await supabase.auth.signOut();

    try {
      await createAdminClient().auth.admin.deleteUser(data.user.id);
    } catch {
      // Best-effort cleanup; the lifecycle cleanup job handles abandoned users.
    }

    return {
      error: "Unable to prepare guest workspace. Please try again.",
    };
  }

  redirect(redirectPath);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function signOutTo(nextPath: string | null | undefined): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(buildAuthRedirectUrl("/login", nextPath));
}

export async function forgotPassword(
  formData: FormData
): Promise<ActionResponse> {
  const supabase = await createClient();

  const email = formData.get("email") as string;

  if (!email) {
    return { error: "Email is required" };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/callback?next=/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { data: undefined };
}

export async function resetPassword(
  formData: FormData
): Promise<ActionResponse> {
  const supabase = await createClient();

  const password = formData.get("password") as string;

  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  redirect("/login");
}
