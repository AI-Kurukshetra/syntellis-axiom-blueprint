import type { User } from "@supabase/supabase-js";

import type { Json, TableInsert, UserProfile } from "@/types";

import { env } from "@/lib/env";
import { profileRepository } from "@/lib/repositories/profile.repository";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

function getFallbackName(email: string | null | undefined) {
  if (!email) {
    return "Authenticated user";
  }

  return email.split("@")[0] || "Authenticated user";
}

function asObjectJson(value: Json | undefined): Record<string, Json> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, Json>;
}

function buildProfileInsert(user: User, existingProfile?: UserProfile | null): TableInsert<"profiles"> {
  const userMetadata = asObjectJson((user.user_metadata ?? {}) as Json);
  const appMetadata = asObjectJson((user.app_metadata ?? {}) as Json);
  const existingMetadata = asObjectJson(existingProfile?.metadata);
  const metadata = {
    ...existingMetadata,
    ...userMetadata,
    auth_app_metadata: appMetadata,
  } satisfies Json;

  return {
    id: user.id,
    organization_id: existingProfile?.organization_id ?? null,
    full_name:
      (typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()) ||
      existingProfile?.full_name ||
      getFallbackName(user.email),
    work_email: user.email ?? existingProfile?.work_email ?? null,
    title: existingProfile?.title ?? null,
    status: existingProfile?.status ?? "active",
    phone_number: existingProfile?.phone_number ?? null,
    mfa_required: existingProfile?.mfa_required ?? false,
    last_sign_in_at: user.last_sign_in_at ?? existingProfile?.last_sign_in_at ?? null,
    invited_by: existingProfile?.invited_by ?? null,
    metadata,
  };
}

function profileNeedsSync(user: User, existingProfile?: UserProfile | null) {
  if (!existingProfile) {
    return true;
  }

  const nextFullName =
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()) ||
    existingProfile.full_name ||
    getFallbackName(user.email);

  return (
    existingProfile.full_name !== nextFullName ||
    existingProfile.work_email !== (user.email ?? null) ||
    existingProfile.last_sign_in_at !== (user.last_sign_in_at ?? null)
  );
}

export async function syncProfileFromAuthUser(user: User, existingProfile?: UserProfile | null) {
  if (!env.supabaseServiceRoleKey) {
    return existingProfile ?? null;
  }

  if (!profileNeedsSync(user, existingProfile)) {
    return existingProfile ?? null;
  }

  const adminClient = getSupabaseAdminClient();
  return profileRepository.upsertProfile(adminClient, buildProfileInsert(user, existingProfile));
}
