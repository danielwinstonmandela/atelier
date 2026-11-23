import { Skeleton } from "@/components/ui/skeleton";

export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="mb-10 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-12 w-64" />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[4/5] w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
