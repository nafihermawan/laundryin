"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";

import { MenuGroup } from "@/components/app/menu-group";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import type { ManagedUser } from "@/lib/data/users";

type RoleFilter = "semua" | "admin" | "cashier";

function displayName(user: ManagedUser) {
  return user.full_name?.trim() || user.email || "Tanpa Nama";
}

function byName(a: ManagedUser, b: ManagedUser) {
  return displayName(a).localeCompare(displayName(b), "id", { sensitivity: "base" });
}

function UserRow({
  user,
  isSelf,
}: {
  user: ManagedUser;
  isSelf: boolean;
}) {
  const name = displayName(user);
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const roleLabel = user.role === "admin" ? "Admin" : "Kasir";
  const secondary = user.email || user.phone || "-";

  return (
    <Link
      href={`/admin/pengguna/${user.id}`}
      className={`flex min-h-[64px] items-center gap-3 px-[14px] py-3 transition-colors hover:bg-slate-50 ${
        user.is_active ? "" : "opacity-55"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
          user.role === "admin" ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-900"
        }`}
      >
        {initial}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <span className="truncate text-[15px] font-semibold text-slate-900">{name}</span>
          {isSelf ? <span className="shrink-0 text-[13px] font-normal text-slate-500">(Anda)</span> : null}
          <Badge variant={user.role === "admin" ? "default" : "secondary"}>{roleLabel}</Badge>
          {!user.is_active ? (
            <Badge variant="outline" className="shrink-0">
              Nonaktif
            </Badge>
          ) : null}
        </span>
        <span className="truncate text-[13px] text-slate-500">{secondary}</span>
      </span>
      <ChevronRight className="h-[18px] w-[18px] shrink-0 text-slate-400" strokeWidth={2} />
    </Link>
  );
}

export function PenggunaList({
  users,
  currentUserId,
}: {
  users: ManagedUser[];
  currentUserId: string;
}) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("semua");

  const counts = {
    semua: users.length,
    admin: users.filter((u) => u.role === "admin").length,
    cashier: users.filter((u) => u.role === "cashier").length,
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "semua" && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        (u.full_name ?? "").toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone ?? "").toLowerCase().includes(q)
      );
    });
  }, [users, query, roleFilter]);

  const admins = filtered.filter((u) => u.role === "admin").sort(byName);
  const cashiers = filtered.filter((u) => u.role === "cashier").sort(byName);

  const chips: { key: RoleFilter; label: string; count: number }[] = [
    { key: "semua", label: "Semua", count: counts.semua },
    { key: "admin", label: "Admin", count: counts.admin },
    { key: "cashier", label: "Kasir", count: counts.cashier },
  ];

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center">
        <p className="text-[15px] text-slate-500">Belum ada akun kasir</p>
        <Link href="/admin/pengguna/baru" className={buttonClass({ variant: "outline", size: "lg" })}>
          Tambah kasir
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <Search className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama, email, atau no. HP"
          aria-label="Cari pengguna"
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-[38px] pr-3 text-[15px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => {
          const active = roleFilter === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              aria-pressed={active}
              onClick={() => setRoleFilter(chip.key)}
              className={`inline-flex h-9 items-center rounded-full px-[14px] text-[13px] transition-colors ${
                active
                  ? "border border-indigo-600 bg-indigo-50 font-semibold text-indigo-600"
                  : "border border-slate-200 bg-white font-medium text-slate-600"
              }`}
            >
              {chip.label} ({chip.count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-[15px] text-slate-500">
          Tidak ada pengguna yang cocok
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {admins.length > 0 ? (
            <MenuGroup title="Admin">
              {admins.map((u) => (
                <UserRow key={u.id} user={u} isSelf={u.id === currentUserId} />
              ))}
            </MenuGroup>
          ) : null}

          {cashiers.length > 0 ? (
            <MenuGroup title="Kasir">
              {cashiers.map((u) => (
                <UserRow key={u.id} user={u} isSelf={u.id === currentUserId} />
              ))}
            </MenuGroup>
          ) : null}
        </div>
      )}

      <Link
        href="/admin/pengguna/baru"
        className={buttonClass({ variant: "outline", size: "lg", fullWidth: true })}
      >
        + Tambah pengguna
      </Link>
    </div>
  );
}
