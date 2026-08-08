import { cn } from "@/lib/utils";

/** يعرض اليوزر باتجاه LTR حتى ما ينقلب مثل 7_c → c_7 داخل صفحة عربية */
export function Username({
  children,
  className,
  as: Tag = "span",
}: {
  children: string;
  className?: string;
  as?: "span" | "p" | "h2" | "h3" | "strong";
}) {
  return (
    <Tag className={cn("username-ltr", className)} dir="ltr">
      {children}
    </Tag>
  );
}
