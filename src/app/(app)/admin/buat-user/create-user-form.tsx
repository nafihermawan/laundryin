"use client";

import { useEffect, useState } from "react";

import { createUser, type CreateUserInput } from "./actions";

export function CreateUserForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<CreateUserInput["role"]>("cashier");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(null), 7000);
    return () => window.clearTimeout(t);
  }, [message]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const res = await createUser({ email, password, fullName, phone, role });

    setIsSubmitting(false);

    if (!("success" in res) || !res.success) {
      setMessage({ type: "error", text: ("error" in res && res.error) ? res.error : "Gagal membuat user" });
      return;
    }

    setPassword("");
    setMessage({
      type: "success",
      text: res.data?.warning ? `User dibuat: ${res.data.user.email}. ${res.data.warning}` : `User dibuat: ${res.data?.user.email}`,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1 sm:col-span-2">
          <div className="text-xs font-medium text-zinc-600">Nama Lengkap</div>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nama petugas"
            className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-400/10"
          />
        </div>

        <div className="flex flex-col gap-1 sm:col-span-2">
          <div className="text-xs font-medium text-zinc-600">No. HP (Opsional)</div>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="08xxxxxxxxxx"
            className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-400/10"
            inputMode="tel"
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="text-xs font-medium text-zinc-600">Email</div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@laundry.local"
            required
            className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-400/10"
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="text-xs font-medium text-zinc-600">Password</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimal 6 karakter"
            required
            className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-400/10"
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="text-xs font-medium text-zinc-600">Role</div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as CreateUserInput["role"])}
            className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-400/10"
          >
            <option value="cashier">Kasir</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="flex items-end justify-end sm:col-span-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
          >
            {isSubmitting ? "Membuat..." : "Buat User"}
          </button>
        </div>
      </div>

      {message ? (
        <div
          className={`mt-4 flex items-start justify-between gap-3 rounded-xl border p-3 text-sm ${
            message.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
              : "border-red-500/30 bg-red-500/10 text-red-700"
          }`}
        >
          <div className="flex-1">{message.text}</div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-black/5"
            aria-label="Tutup"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      ) : null}
    </form>
  );
}
