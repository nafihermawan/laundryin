export function Skeleton({
  className = "",
  rounded = "md",
}: {
  className?: string;
  rounded?: "md" | "full";
}) {
  return (
    <div
      className={`skeleton-pulse bg-[#E2E8F0] ${rounded === "full" ? "rounded-full" : "rounded-md"} ${className}`}
    />
  );
}
