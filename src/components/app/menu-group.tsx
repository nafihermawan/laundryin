import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { SectionHeading } from "./section-heading";

export function MenuGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section>
      {title ? <SectionHeading>{title}</SectionHeading> : null}
      <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {children}
      </div>
    </section>
  );
}

export function MenuRow({
  title,
  description,
  icon: Icon,
  href,
  onClick,
  tone = "neutral",
  iconBox = true,
  destructive = false,
  trailing,
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  tone?: "primary" | "neutral";
  iconBox?: boolean;
  destructive?: boolean;
  trailing?: ReactNode;
}) {
  const iconTone = destructive
    ? "bg-red-50 text-red-600"
    : tone === "primary"
      ? "bg-indigo-50 text-indigo-600"
      : "bg-slate-100 text-slate-900";

  const rowClass = `flex w-full items-center gap-3 px-[14px] py-3 text-left transition-colors hover:bg-slate-50 ${
    description ? "min-h-[68px]" : "min-h-[56px]"
  }`;

  const content = (
    <>
      {iconBox ? (
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${iconTone}`}
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
      ) : (
        <Icon
          className={`h-5 w-5 shrink-0 ${destructive ? "text-red-600" : "text-slate-500"}`}
          strokeWidth={2}
        />
      )}
      <span className="flex flex-1 flex-col">
        <span
          className={`text-[15px] font-semibold ${
            destructive ? "text-red-600" : "text-slate-900"
          }`}
        >
          {title}
        </span>
        {description ? <span className="text-[13px] text-slate-500">{description}</span> : null}
      </span>
      {trailing ?? (
        <ChevronRight className="h-[18px] w-[18px] shrink-0 text-slate-400" strokeWidth={2} />
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={rowClass}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={rowClass}>
      {content}
    </button>
  );
}
