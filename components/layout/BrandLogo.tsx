import { cn } from "@/lib/utils";

// The "EF" mark. Decorative: the application name next to it carries the meaning.
export function BrandLogo({ size = "md", className }: { size?: "md" | "lg"; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex items-center justify-center rounded-xl bg-primary font-bold tracking-tight text-primary-foreground shadow-sm",
        size === "lg" ? "h-11 w-11 text-lg" : "h-9 w-9 text-sm",
        className,
      )}
    >
      EF
    </span>
  );
}
