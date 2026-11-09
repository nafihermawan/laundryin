import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

import { isUserRole, type UserRole } from "./roles";

export type SessionProfile = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
};

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function resolveUser(supabase: Supabase): Promise<{ id: string; email: string } | null> {
  try {
    const { data, error } = await supabase.auth.getClaims();

    if (data?.claims?.sub) {
      return {
        id: data.claims.sub,
        email: typeof data.claims.email === "string" ? data.claims.email : "",
      };
    }

    if (!error) return null;
  } catch {
    // JWKS fetch or local verification failed — fall back to the network check.
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? { id: user.id, email: user.email ?? "" } : null;
}

export const getSessionProfile = cache(async (): Promise<SessionProfile | null> => {
  const supabase = await createClient();

  const user = await resolveUser(supabase);
  if (!user) return null;

  let { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    ({ data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .maybeSingle());
  }

  return {
    id: user.id,
    email: user.email,
    name: profile?.full_name?.trim() || user.email || "User",
    role: isUserRole(profile?.role) ? profile.role : "cashier",
    isActive: profile?.is_active !== false,
  };
});
