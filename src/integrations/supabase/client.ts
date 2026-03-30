import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const PROJECT_REF =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ||
  (() => {
    try {
      return new URL(SUPABASE_URL).hostname.split(".")[0] || "default";
    } catch {
      return "default";
    }
  })();

/** Per-project storage key avoids a session JWT from another Supabase project (Invalid JWT on Edge Functions). */
const AUTH_STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    storageKey: AUTH_STORAGE_KEY,
    persistSession: true,
    autoRefreshToken: true,
  },
});