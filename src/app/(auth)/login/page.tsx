import { redirect } from "next/navigation";
import Image from "next/image";

import { getUserRole } from "@/lib/auth/get-user-role";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const hasError = sp?.error === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const role = await getUserRole(supabase, user.id);
    redirect(role === "admin" ? "/admin" : "/kasir");
  }

  async function signIn(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) redirect("/login?error=1");

    const userId = data.user?.id;
    if (!userId) redirect("/kasir");

    const role = await getUserRole(supabase, userId);
    redirect(role === "admin" ? "/admin" : "/kasir");
  }

  return (
    <div className="flex flex-col gap-6 text-white">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white">
            <Image src="/icon.svg" alt="laundry.in" width={40} height={40} priority />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm text-white/70">laundry.in</span>
            <h1 className="text-xl font-semibold tracking-tight">Masuk</h1>
          </div>
        </div>
      </div>

      {hasError ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-50">
          Email atau password salah.
        </div>
      ) : null}

      <form action={signIn} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-white/80">Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="contoh: kasir@laundry.local"
            className="h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-sky-400/60 focus:ring-4 focus:ring-sky-400/10"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-white/80">Password</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-sky-400/60 focus:ring-4 focus:ring-sky-400/10"
          />
        </label>

        <button
          type="submit"
          className="mt-1 inline-flex h-11 items-center justify-center rounded-xl bg-sky-400 px-4 text-sm font-semibold text-zinc-950 shadow-sm shadow-sky-400/20 transition hover:bg-sky-300"
        >
          Masuk
        </button>
      </form>
    </div>
  );
}
