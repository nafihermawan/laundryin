import Link from "next/link";
import { redirect } from "next/navigation";

import { getUserRole } from "@/lib/auth/get-user-role";
import { createClient } from "@/lib/supabase/server";

import { CreateUserForm } from "./create-user-form";

export const dynamic = "force-dynamic";

export default async function BuatUserPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) redirect("/login");

  const role = await getUserRole(supabase, user.id);
  if (role !== "admin") redirect("/kasir");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Buat User Baru</h1>
          <p className="text-sm text-zinc-600">Tambah akun kasir atau admin.</p>
        </div>
        <Link
          href="/admin"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
        >
          Kembali
        </Link>
      </div>

      <CreateUserForm />
    </div>
  );
}

