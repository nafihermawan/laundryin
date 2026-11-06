"use server";

import { revalidatePath } from "next/cache";

import { error as actionError, success, type ActionResponse } from "@/lib/action-response";
import { getUserRole } from "@/lib/auth/get-user-role";
import { isUserRole, type UserRole } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin(): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: ActionResponse<never> }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, response: actionError("User tidak terautentikasi") };

  const role = await getUserRole(supabase, user.id);
  if (role !== "admin") return { ok: false, response: actionError("Akses ditolak") };

  return { ok: true, userId: user.id };
}

export type CreateUserInput = {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role: UserRole;
};

export async function createUser(
  input: CreateUserInput,
): Promise<ActionResponse<{ user: { id: string; email: string } }>> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const email = String(input.email ?? "").trim().toLowerCase();
  const password = String(input.password ?? "");
  const fullName = String(input.fullName ?? "").trim();
  const phone = String(input.phone ?? "").trim();
  const role = input.role;

  if (!email.includes("@")) return actionError("Email tidak valid");
  if (password.length < 6) return actionError("Kata sandi minimal 6 karakter");
  if (!isUserRole(role)) return actionError("Role tidak valid");

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName || undefined, phone: phone || undefined },
  });

  if (error || !data.user) return actionError(error?.message ?? "Gagal membuat pengguna");

  const userId = data.user.id;

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: userId,
      role,
      full_name: fullName || null,
      phone: phone || null,
      is_active: true,
    },
    { onConflict: "id" },
  );

  if (profileError) return actionError(profileError.message || "Gagal menyimpan profil");

  revalidatePath("/admin/pengguna");
  return success({ user: { id: userId, email: data.user.email ?? email } });
}

export async function updateUserProfile(
  id: string,
  input: { fullName: string; phone: string; role: UserRole },
): Promise<ActionResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  if (!id) return actionError("Pengguna tidak valid");
  if (!isUserRole(input.role)) return actionError("Role tidak valid");

  if (id === auth.userId && input.role !== "admin") {
    return actionError("Tidak dapat mengubah role akun Anda sendiri");
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({
      full_name: String(input.fullName ?? "").trim() || null,
      phone: String(input.phone ?? "").trim() || null,
      role: input.role,
    })
    .eq("id", id);

  if (error) return actionError(error.message || "Gagal menyimpan perubahan");

  const fullName = String(input.fullName ?? "").trim();
  if (fullName) {
    await admin.auth.admin.updateUserById(id, { user_metadata: { full_name: fullName } });
  }

  revalidatePath("/admin/pengguna");
  revalidatePath(`/admin/pengguna/${id}`);
  return success(undefined);
}

export async function resetUserPassword(id: string, password: string): Promise<ActionResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  if (!id) return actionError("Pengguna tidak valid");
  if (String(password ?? "").length < 6) return actionError("Kata sandi minimal 6 karakter");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, { password });

  if (error) return actionError(error.message || "Gagal mengubah kata sandi");

  return success(undefined);
}

export async function setUserActive(id: string, isActive: boolean): Promise<ActionResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  if (!id) return actionError("Pengguna tidak valid");
  if (id === auth.userId) return actionError("Tidak dapat menonaktifkan akun Anda sendiri");

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ is_active: isActive }).eq("id", id);

  if (error) return actionError(error.message || "Gagal memperbarui status akun");

  revalidatePath("/admin/pengguna");
  revalidatePath(`/admin/pengguna/${id}`);
  return success(undefined);
}
