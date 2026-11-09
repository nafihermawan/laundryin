import { redirect } from "next/navigation";
import { WashingMachine } from "lucide-react";

import { APP_VERSION } from "@/lib/app-version";
import { getSessionProfile } from "@/lib/auth/session";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const profile = await getSessionProfile();

  if (profile) {
    redirect(profile.role === "admin" ? "/admin" : "/kasir");
  }

  return (
    <div
      className="flex min-h-[100dvh] flex-col bg-[#F8FAFC]"
      style={{ paddingTop: "calc(88px + env(safe-area-inset-top))" }}
    >
      <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col gap-8 px-6">
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600">
              <WashingMachine className="h-6 w-6 text-white" strokeWidth={2} />
            </span>
            <span className="font-display text-[20px] font-bold tracking-tight text-slate-900">
              laundry.in
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-[26px] font-bold tracking-[-0.02em] text-slate-900">
              Masuk ke akun
            </h1>
            <p className="text-[15px] leading-relaxed text-slate-500">
              Gunakan akun kasir atau admin yang diberikan pemilik laundry.
            </p>
          </div>
        </div>

        <LoginForm />
      </div>

      <footer
        className="mx-auto w-full max-w-[400px] px-6 text-center text-xs text-slate-500"
        style={{ paddingBottom: "calc(32px + env(safe-area-inset-bottom))" }}
      >
        laundry.in v{APP_VERSION}
      </footer>
    </div>
  );
}
