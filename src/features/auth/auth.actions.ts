"use server";

import { redirect } from "next/navigation";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { safeLogAuditEvent } from "@/lib/audit";
import { RepositoryError } from "@/lib/repositories/base";
import { executeServerAction } from "@/lib/server-action";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function signOutAction() {
  const result = await executeServerAction(async () => {
    const currentUser = await getCurrentUserContext();
    const client = await getSupabaseServerClient();
    const { error } = await client.auth.signOut();

    if (error) {
      throw new RepositoryError("Failed to sign out.", error);
    }

    if (currentUser) {
      await safeLogAuditEvent({
        organizationId: currentUser.organization?.id ?? currentUser.profile?.organization_id ?? null,
        actorUserId: currentUser.authUser.id,
        action: "auth.sign_out",
        entityType: "session",
        scopeLevel: currentUser.organization ? "organization" : "global",
        metadata: {
          source: "app_sidebar",
        },
      });
    }

    return "/sign-in?message=You%20have%20been%20signed%20out.";
  });

  if (!result.success) {
    redirect(`/sign-in?error=${encodeURIComponent(result.error.message)}`);
  }

  redirect(result.data);
}
