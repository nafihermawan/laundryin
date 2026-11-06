import type { ButtonHTMLAttributes } from "react";

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
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, fullWidth, className })}
      {...rest}
    />
  );
}
