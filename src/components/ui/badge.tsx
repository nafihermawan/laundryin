import type { ReactNode } from "react";

type BadgeVariant = "default" | "secondary" | "outline";

export function Badge({
  variant = "secondary",
  children,
  className = "",
}: {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}) {
  const styles: Record<BadgeVariant, string> = {
    default: "bg-indigo-50 text-indigo-600",
    secondary: "bg-slate-100 text-slate-600",
    outline: "border border-slate-200 text-slate-500",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
