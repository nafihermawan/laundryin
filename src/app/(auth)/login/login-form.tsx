"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { useOnline } from "@/lib/use-online";

const inputClass =
  "h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-600 focus:ring-[3px] focus:ring-indigo-600/15 disabled:bg-slate-100 disabled:opacity-60";

export function LoginForm() {
  const router = useRouter();
  const online = useOnline();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [focusPasswordSignal, setFocusPasswordSignal] = useState(0);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focusPasswordSignal) return;
    passwordRef.current?.focus();
    passwordRef.current?.scrollIntoView({ block: "center" });
  }, [focusPasswordSignal]);

  function keepVisible(el: HTMLElement | null) {
    if (!el) return;
    window.setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 150);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || !online) return;

    const nextErrors: { email?: string; password?: string } = {};
    if (!email.trim()) nextErrors.email = "Email wajib diisi";
    if (!password) nextErrors.password = "Kata sandi wajib diisi";
    setFieldErrors(nextErrors);
    setError(null);

    if (nextErrors.email || nextErrors.password) {
      (nextErrors.email ? emailRef : passwordRef).current?.focus();
      return;
    }

    setLoading(true);
    setSlow(false);
    const slowTimer = window.setTimeout(() => setSlow(true), 10000);

    try {
      const res = await fetch("/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = (await res.json().catch(() => ({ ok: false, error: "unknown" }))) as
        | { ok: true; redirect?: string }
        | { ok: false; error?: string };

      window.clearTimeout(slowTimer);

      if (data.ok) {
        // Stay in loading state until the destination page renders.
        router.push(data.redirect || "/kasir");
        return;
      }

      setLoading(false);
      setSlow(false);

      if (data.error === "inactive") {
        setError("Akun ini sudah dinonaktifkan. Hubungi admin.");
      } else if (data.error === "invalid") {
        setError("Email atau kata sandi salah.");
        setPassword("");
        setFocusPasswordSignal((n) => n + 1);
      } else {
        setError("Tidak dapat masuk. Coba lagi.");
      }
    } catch {
      window.clearTimeout(slowTimer);
      setLoading(false);
      setSlow(false);
      setError("Tidak dapat terhubung. Coba lagi.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={onSubmit} noValidate aria-busy={loading} className="flex flex-col gap-[18px]">
        {!online ? (
          <div
            role="status"
            className="rounded-[10px] border border-[#FED7AA] bg-[#FFF7ED] px-3 py-2.5 text-sm text-[#9A3412]"
          >
            Tidak ada koneksi internet
          </div>
        ) : null}

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-900">
            Email
          </label>
          <input
            id="email"
            ref={emailRef}
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => keepVisible(emailRef.current)}
            disabled={loading}
            placeholder="nama@laundry.local"
            className={inputClass}
          />
          {fieldErrors.email ? <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p> : null}
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-900">
            Kata sandi
          </label>
          <div className="relative">
            <input
              id="password"
              ref={passwordRef}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => keepVisible(passwordRef.current)}
              disabled={loading}
              placeholder="Masukkan kata sandi"
              className={`${inputClass} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              disabled={loading}
              aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              className="absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-slate-500 disabled:opacity-50"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" strokeWidth={2} />
              ) : (
                <Eye className="h-5 w-5" strokeWidth={2} />
              )}
            </button>
          </div>
          {fieldErrors.password ? <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p> : null}
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2.5 text-sm text-[#B91C1C]"
          >
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading || !online}
          aria-busy={loading || undefined}
          className="mt-1.5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-[15px] font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2
                className="h-[18px] w-[18px] animate-[spin_0.8s_linear_infinite] motion-reduce:animate-[spin_2s_linear_infinite]"
                strokeWidth={2.4}
              />
              {slow ? "Masih memproses…" : "Masuk…"}
            </>
          ) : (
            "Masuk"
          )}
        </button>
      </form>

      <p className="text-sm text-slate-500">
        Lupa kata sandi? Minta admin untuk meresetnya dari menu Pengguna.
      </p>
    </div>
  );
}
