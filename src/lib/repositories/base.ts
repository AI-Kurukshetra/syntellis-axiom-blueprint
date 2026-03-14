import type { PostgrestError, PostgrestResponse, PostgrestSingleResponse, SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types";

export type AppSupabaseClient = SupabaseClient<Database>;

export class RepositoryError extends Error {
  constructor(message: string, public readonly cause?: PostgrestError | Error | null) {
    super(message);
    this.name = "RepositoryError";
  }
}

export function unwrapMany<T>(response: PostgrestResponse<T>, context: string): T[] {
  if (response.error) {
    throw new RepositoryError(context, response.error);
  }

  return response.data ?? [];
}

export function unwrapSingle<T>(response: PostgrestSingleResponse<T>, context: string): T {
  if (response.error) {
    throw new RepositoryError(context, response.error);
  }

  if (!response.data) {
    throw new RepositoryError(`${context} returned no rows.`);
  }

  return response.data;
}

export function unwrapMaybeSingle<T>(response: PostgrestSingleResponse<T | null>, context: string): T | null {
  if (response.error) {
    throw new RepositoryError(context, response.error);
  }

  return response.data ?? null;
}

export function unwrapCount(
  response: Pick<PostgrestResponse<null>, "count" | "error">,
  context: string
): number {
  if (response.error) {
    throw new RepositoryError(context, response.error);
  }

  return response.count ?? 0;
}

export function assertNoError(
  response: Pick<PostgrestResponse<null> | PostgrestSingleResponse<null>, "error">,
  context: string
) {
  if (response.error) {
    throw new RepositoryError(context, response.error);
  }
}
