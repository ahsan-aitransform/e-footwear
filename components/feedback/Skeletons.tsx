import { cn } from "@/lib/utils";

// Placeholders shown while data loads, so the page does not jump when it arrives.
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function TextLinesSkeleton({ lineCount = 3 }: { lineCount?: number }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: lineCount }, (_, index) => (
        <Skeleton key={index} className={cn("h-4", index === lineCount - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rowCount = 5, columnCount = 4 }: { rowCount?: number; columnCount?: number }) {
  return (
    <div className="divide-y divide-border" aria-hidden="true">
      {Array.from({ length: rowCount }, (_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 px-5 py-3.5">
          {Array.from({ length: columnCount }, (_, columnIndex) => (
            <Skeleton key={columnIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
