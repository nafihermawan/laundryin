"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";

import { getUserRole } from "@/lib/auth/get-user-role";
import { isUserRole, type UserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { ActionResponse, success, error as actionError } from "@/lib/action-response";

export type CreateUserInput = {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role: UserRole;
};

export async function createUser(input: CreateUserInput): Promise<ActionResponse<{ user: { id: string; email: string }; warning?: string }>> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return actionError("User tidak terautentikasi");

  const role = await getUserRole(supabase, user.id);
  if (role !== "admin") return actionError("Akses ditolak");

  const email = String(input.email ?? "").trim().toLowerCase();
  const password = String(input.password ?? "");
  const fullName = String(input.fullName ?? "").trim();
  const phone = String(input.phone ?? "").trim();
  const newRole = input.role;

  if (!email.includes("@")) return actionError("Email tidak valid");
  if (password.length < 6) return actionError("Password minimal 6 karakter");
  if (!isUserRole(newRole)) return actionError("Role tidak valid");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return actionError("Konfigurasi server belum lengkap (SUPABASE_SERVICE_ROLE_KEY)");
  }

  const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName || undefined, phone: phone || undefined },
  });

  if (error || !data.user) return actionError(error?.message ?? "Gagal membuat user");

  const userId = data.user.id;

  let warning: string | undefined;
  const profilePayload = {
    id: userId,
    role: newRole,
    full_name: fullName || null,
    phone: phone || null,
  };

  const { error: profileError } = await admin
    .from("profiles")
    .upsert(profilePayload, { onConflict: "id" });

  if (profileError) {
    const msg = profileError.message ?? "";
    const isSchemaCacheIssue =
      msg.includes("schema cache") && msg.includes("phone") && msg.includes("profiles");

    if (!isSchemaCacheIssue) return actionError(msg || "Gagal menyimpan profile");

    warning = "User berhasil dibuat, tapi kolom phone belum terbaca oleh API. Reload schema cache Supabase lalu coba simpan ulang.";

    const { error: retryError } = await admin.from("profiles").upsert(
      {
        id: userId,
        role: newRole,
        full_name: fullName || null,
      },
      { onConflict: "id" },
    );

    if (retryError) return actionError(retryError.message);
  }

  return success({ user: { id: userId, email: data.user.email ?? email }, warning });
}
