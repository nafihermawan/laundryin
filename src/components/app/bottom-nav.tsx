"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Briefcase,
  CircleUser,
  History,
  Home,
  Plus,
  type LucideIcon,
} from "lucide-react";

import { useToast } from "@/components/ui/toast";

export type NavRole = "admin" | "cashier";

type Item = { href: string; label: string; icon: LucideIcon; exact?: boolean };

const ADMIN_LEFT: Item[] = [
  { href: "/admin", label: "Beranda", icon: Home, exact: true },
  { href: "/admin/riwayat", label: "Riwayat", icon: History },
];
const ADMIN_RIGHT: Item[] = [
  { href: "/admin/laporan", label: "Laporan", icon: BarChart3 },
  { href: "/admin/akun", label: "Akun", icon: CircleUser },
];
const CASHIER_LEFT: Item[] = [
  { href: "/kasir", label: "Beranda", icon: Home, exact: true },
  { href: "/kasir/riwayat", label: "Riwayat", icon: History },
];
const CASHIER_RIGHT: Item[] = [
  { href: "/kasir/shift", label: "Shift", icon: Briefcase },
  { href: "/kasir/akun", label: "Akun", icon: CircleUser },
];

export function BottomNav({
  role,
  hasActiveShift = true,
}: {
  role: NavRole;
  hasActiveShift?: boolean;
}) {
  const pathname = usePathname();
  const { show } = useToast();

  const left = role === "admin" ? ADMIN_LEFT : CASHIER_LEFT;
  const right = role === "admin" ? ADMIN_RIGHT : CASHIER_RIGHT;
  const centerActive = role === "admin" ? true : hasActiveShift;

  function onCenterTap() {
    show("Buka shift dulu untuk membuat transaksi");
    document.getElementById("shift-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <nav
        aria-label="Navigasi utama"
        className="relative mx-auto grid h-[84px] w-full max-w-6xl grid-cols-5 items-end overflow-visible px-2 pt-1.5 pb-[18px]"
      >
        {left.map((item) => (
          <NavItem key={item.href} item={item} pathname={pathname} />
        ))}

        {centerActive ? (
          <Link
            href="/kasir/transaksi/baru"
            aria-label="Buat transaksi baru"
            className="flex min-h-[52px] flex-col items-center justify-end gap-1"
          >
            <span className="absolute -top-[27px] left-1/2 flex h-14 w-14 shrink-0 -translate-x-1/2 items-center justify-center rounded-[18px] bg-indigo-600 shadow-[0_8px_20px_rgba(79,70,229,0.35)]">
              <Plus className="h-[26px] w-[26px] text-white" strokeWidth={2.4} />
            </span>
            <span className="whitespace-nowrap text-[11px] font-semibold text-slate-900">Transaksi</span>
          </Link>
        ) : (
          <button
            type="button"
            aria-disabled="true"
            aria-label="Buat transaksi baru, buka shift terlebih dahulu"
            onClick={onCenterTap}
            className="flex min-h-[52px] cursor-not-allowed flex-col items-center justify-end gap-1"
          >
            <span className="absolute -top-[27px] left-1/2 flex h-14 w-14 shrink-0 -translate-x-1/2 items-center justify-center rounded-[18px] bg-slate-200">
              <Plus className="h-[26px] w-[26px] text-slate-500" strokeWidth={2.4} />
            </span>
            <span className="whitespace-nowrap text-[11px] font-semibold text-slate-500">Transaksi</span>
          </button>
        )}

        {right.map((item) => (
          <NavItem key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>
    </div>
  );
}

function NavItem({ item, pathname }: { item: Item; pathname: string }) {
  const active = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-[52px] flex-col items-center justify-end gap-1 ${
        active ? "font-semibold text-indigo-600" : "font-medium text-slate-500"
      }`}
    >
      <Icon className="h-[22px] w-[22px]" strokeWidth={2} />
      <span className="whitespace-nowrap text-[11px]">{item.label}</span>
    </Link>
  );
}
