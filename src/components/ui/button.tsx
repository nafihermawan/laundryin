import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "outline";
type ButtonSize = "lg" | "md";

export function buttonClass(opts?: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}) {
  const variant = opts?.variant ?? "primary";
  const size = opts?.size ?? "md";

  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";
  const sizes: Record<ButtonSize, string> = {
    lg: "h-12 px-5 text-[15px]",
    md: "h-10 px-4 text-sm",
  };
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    outline: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  };

  return `${base} ${sizes[size]} ${variants[variant]} ${opts?.fullWidth ? "w-full" : ""} ${opts?.className ?? ""}`;
}

export function Button({
  variant,
  size,
  fullWidth,
  className,
  type = "button",
  loading = false,
  loadingText = "Memproses…",
  children,
  disabled,
  onClick,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  loadingText?: string;
  children?: ReactNode;
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={(e) => {
        if (loading) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      className={buttonClass({ variant, size, fullWidth, className })}
      {...rest}
    >
      <span className="inline-grid">
        <span
          className="col-start-1 row-start-1 inline-flex items-center justify-center gap-2"
          style={{ visibility: loading ? "hidden" : "visible" }}
        >
          {children}
        </span>
        <span
          className="col-start-1 row-start-1 inline-flex items-center justify-center gap-2"
          style={{ visibility: loading ? "visible" : "hidden" }}
          aria-hidden={!loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} /> : null}
          {loadingText}
        </span>
      </span>
    </button>
  );
}
