import Link from "next/link";

export function SummaryCard({
  href,
  label,
  value,
  tone,
  dot,
}: {
  href: string;
  label: string;
  value: number;
  tone: "neutral" | "emerald" | "amber";
  dot?: boolean;
}) {
  const styles = {
    neutral: { box: "bg-slate-100", label: "text-slate-600", dot: "", value: "text-slate-900" },
    emerald: {
      box: "bg-emerald-50",
      label: "text-emerald-700",
      dot: "bg-emerald-500",
      value: "text-emerald-800",
    },
    amber: {
      box: "bg-orange-50",
      label: "text-amber-700",
      dot: "bg-amber-500",
      value: "text-orange-800",
    },
  }[tone];

  return (
    <Link
      href={href}
      className={`flex min-h-[88px] flex-col justify-between rounded-xl p-3 ${styles.box}`}
    >
      <span className={`flex items-center gap-1.5 text-xs font-medium ${styles.label}`}>
        {dot ? <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} /> : null}
        {label}
      </span>
      <span className={`font-display text-[28px] font-bold leading-none ${styles.value}`}>
        {value}
      </span>
    </Link>
  );
}
