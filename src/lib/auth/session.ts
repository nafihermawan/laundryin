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

export const getSessionProfile = cache(async (): Promise<SessionProfile | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    email: user.email ?? "",
    name: profile?.full_name?.trim() || user.email || "User",
    role: isUserRole(profile?.role) ? profile.role : "cashier",
    isActive: profile?.is_active !== false,
  };
});
