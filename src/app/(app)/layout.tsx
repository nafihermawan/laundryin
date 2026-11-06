import { redirect } from "next/navigation";

import { ToastProvider } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_active === false) {
    await supabase.auth.signOut();
    redirect("/login?error=inactive");
  }

  return (
    <ToastProvider>
      <div className="flex min-h-full flex-1 flex-col bg-slate-50 text-slate-900">{children}</div>
    </ToastProvider>
  );
}
