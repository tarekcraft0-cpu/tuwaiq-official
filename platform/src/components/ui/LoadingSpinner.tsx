import { cn } from "@/lib/utils";

export function LoadingSpinner({
  className,
  size = 18,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-current border-r-transparent",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}
