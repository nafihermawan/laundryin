import Link from "next/link";
import { WashingMachine } from "lucide-react";

export function HomeHeader({
  name,
  homeHref = "/admin",
  accountHref = "/admin/akun",
}: {
  name: string;
  homeHref?: string;
  accountHref?: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <header className="h-16 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Link href={homeHref} className="flex items-center gap-2" aria-label="laundry.in">
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-indigo-600">
            <WashingMachine className="h-5 w-5 text-white" strokeWidth={2} />
          </span>
          <span className="font-display text-[18px] font-bold tracking-tight text-slate-900">
            laundry.in
          </span>
        </Link>

        <Link
          href={accountHref}
          aria-label={`Buka akun ${name}`}
          className="flex h-11 w-11 items-center justify-center rounded-full"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-900">
            {initial}
          </span>
        </Link>
      </div>
    </header>
  );
}
