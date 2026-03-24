import type { SupabaseClient } from "@supabase/supabase-js";

import { isUserRole, type UserRole } from "./roles";

export async function getUserRole(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserRole> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) return "cashier";

  return isUserRole(data?.role) ? data.role : "cashier";
}
