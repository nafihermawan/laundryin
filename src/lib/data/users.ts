import { isUserRole, type UserRole } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";

export type ManagedUser = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
};

function normalizeRole(value: unknown): UserRole {
  return isUserRole(value) ? value : "cashier";
}

export async function listUsers(): Promise<ManagedUser[]> {
  const admin = createAdminClient();

  const { data: authData, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) throw new Error(error.message);

  let { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, phone, role, is_active, created_at");
  if (!profiles) {
    ({ data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, phone, role, created_at"));
  }

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return (authData.users ?? []).map((u) => {
    const profile = profileById.get(u.id);
    return {
      id: u.id,
      email: u.email ?? "",
      full_name: profile?.full_name ?? null,
      phone: profile?.phone ?? null,
      role: normalizeRole(profile?.role),
      is_active: profile?.is_active ?? true,
      created_at: profile?.created_at ?? u.created_at,
    };
  });
}

export async function getUserById(id: string): Promise<ManagedUser | null> {
  const admin = createAdminClient();

  const { data: authUser, error } = await admin.auth.admin.getUserById(id);
  if (error || !authUser.user) return null;

  let { data: profile } = await admin
    .from("profiles")
    .select("id, full_name, phone, role, is_active, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!profile) {
    ({ data: profile } = await admin
      .from("profiles")
      .select("id, full_name, phone, role, created_at")
      .eq("id", id)
      .maybeSingle());
  }

  return {
    id,
    email: authUser.user.email ?? "",
    full_name: profile?.full_name ?? null,
    phone: profile?.phone ?? null,
    role: normalizeRole(profile?.role),
    is_active: profile?.is_active ?? true,
    created_at: profile?.created_at ?? authUser.user.created_at,
  };
}
