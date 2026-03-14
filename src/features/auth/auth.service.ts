import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

export const authService = {
  getClient() {
    return getSupabaseBrowserClient();
  },
};
