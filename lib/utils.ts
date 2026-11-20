import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// shadcn helper: joins class names and resolves conflicting Tailwind classes.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
