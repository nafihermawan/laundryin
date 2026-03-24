import { redirect } from "next/navigation";

import { getUserRole } from "@/lib/auth/get-user-role";
import { createClient } from "@/lib/supabase/server";

import { BottomNavShell } from "./bottom-nav-shell";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  let user: { id: string; email?: string | null } | null = null;
  try {
    const result = await supabase.auth.getUser();
    if (result.error) redirect("/logout");
    user = result.data.user;
  } catch {
    redirect("/logout");
  }

  if (!user) redirect("/login");

  const role = await getUserRole(supabase, user.id);
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  const displayName = profile?.full_name?.trim() || user.email || "User";

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
          <a
            href={role === "admin" ? "/admin" : "/kasir"}
            className="inline-flex items-center gap-2 font-semibold tracking-tight text-zinc-900"
            aria-label="Home"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 7C4 5.89543 4.89543 5 6 5H18C19.1046 5 20 5.89543 20 7V19H4V7Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M8 9H16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M8 13H14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span>laundry.in</span>
          </a>

          <div className="text-right">
            <div className="text-sm font-medium text-zinc-900">
              {displayName}
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24">
        {children}
      </main>
      <BottomNavShell homeHref={role === "admin" ? "/admin" : "/kasir"} />
    </div>
  );
}
