import { redirect } from "next/navigation";

import { getSessionProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await getSessionProfile();

  if (!profile) redirect("/login");

  if (!profile.isActive) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login?error=inactive");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-slate-50 text-slate-900">{children}</div>
  );
}
