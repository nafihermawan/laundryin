import { createClient } from "@/lib/supabase/server";

import { getUserRole } from "./get-user-role";
import type { UserRole } from "./roles";

export type AccountInfo = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export async function getAccount(): Promise<AccountInfo | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const role = await getUserRole(supabase, user.id);
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    name: profile?.full_name?.trim() || user.email || "User",
    email: user.email ?? "",
    role,
  };
}
