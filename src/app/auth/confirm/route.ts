import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { safeLogAuditEvent } from "@/lib/audit";
import { syncProfileFromAuthUser } from "@/lib/auth/profile-sync";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

async function logConfirmationAudit(user: { id: string; user_metadata?: Record<string, unknown> | null }, profileOrganizationId?: string | null) {
  const invitedOrganizationId =
    typeof user.user_metadata?.invited_organization_id === "string" ? user.user_metadata.invited_organization_id : null;
  const organizationId = profileOrganizationId ?? invitedOrganizationId;

  await safeLogAuditEvent({
    organizationId,
    actorUserId: user.id,
    action: invitedOrganizationId ? "user.invitation_accepted" : "auth.email_confirmed",
    entityType: "profile",
    entityId: user.id,
    scopeLevel: "organization",
    metadata: {
      invited_organization_id: invitedOrganizationId,
    },
  });
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/workspace";
  const signInUrl = new URL("/sign-in", requestUrl.origin);

  const supabase = await getSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const profile = await syncProfileFromAuthUser(user);
        await logConfirmationAudit(user, profile?.organization_id ?? null);
      }

      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }

    signInUrl.searchParams.set("error", error.message);
    return NextResponse.redirect(signInUrl);
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const profile = await syncProfileFromAuthUser(user);
        await logConfirmationAudit(user, profile?.organization_id ?? null);
      }

      const redirectUrl = new URL(next, requestUrl.origin);
      redirectUrl.searchParams.set("confirmed", "1");
      return NextResponse.redirect(redirectUrl);
    }

    signInUrl.searchParams.set("error", error.message);
    return NextResponse.redirect(signInUrl);
  }

  signInUrl.searchParams.set("error", "Email confirmation link is invalid or expired.");
  return NextResponse.redirect(signInUrl);
}
