"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CircleUser, History, Home, Plus, type LucideIcon } from "lucide-react";

type Item = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  center?: boolean;
};

const ITEMS: Item[] = [
  { href: "/admin", label: "Beranda", icon: Home, exact: true },
  { href: "/admin/riwayat", label: "Riwayat", icon: History },
  { href: "/kasir/transaksi/baru", label: "Transaksi", icon: Plus, center: true },
  { href: "/admin/laporan", label: "Laporan", icon: BarChart3 },
  { href: "/admin/akun", label: "Akun", icon: CircleUser },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <nav
        aria-label="Navigasi utama"
        className="mx-auto grid h-[84px] w-full max-w-6xl grid-cols-5 items-end px-2"
      >
        {ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          if (item.center) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label="Buat transaksi baru"
                className="flex min-h-[52px] flex-col items-center justify-end gap-1 pb-2"
              >
                <span className="-mt-[26px] flex h-14 w-14 items-center justify-center rounded-[18px] bg-indigo-600 shadow-[0_8px_20px_rgba(79,70,229,0.35)]">
                  <Icon className="h-[26px] w-[26px] text-white" strokeWidth={2.5} />
                </span>
                <span className="whitespace-nowrap text-[11px] font-semibold text-slate-900">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[52px] flex-col items-center justify-end gap-1 pb-2 ${
                active ? "font-semibold text-indigo-600" : "font-medium text-slate-500"
              }`}
            >
              <Icon className="h-[22px] w-[22px]" strokeWidth={2} />
              <span className="whitespace-nowrap text-[11px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
