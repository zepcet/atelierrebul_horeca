/** Supabase dashboard often documents `SUPABASE_SERVICE_ROLE_KEY`; some teams use `SERVICE_ROLE_KEY`. */
export function getServiceRoleKey(): string {
  return (
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ||
    Deno.env.get("SERVICE_ROLE_KEY")?.trim() ||
    ""
  );
}
