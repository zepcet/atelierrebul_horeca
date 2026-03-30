/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_SUPABASE_PROJECT_ID?: string;
  /** Optional: prefill the sign-in email field (user must exist in Supabase Auth). */
  readonly VITE_PREFILL_LOGIN_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
