import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function ScorecardSkeleton() {
  return (
    <Card className="mt-8 p-8 bg-card border-border shadow-lg animate-fade-in">
      <Skeleton className="h-8 w-48 mb-6" />
      <div className="space-y-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3 p-4 bg-card/50 rounded-lg border border-border/50">
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-6 w-12" />
            </div>
            <Skeleton className="h-3 w-full rounded-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ComparisonSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="p-6">
          <div className="flex justify-between items-center mb-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-6 w-16" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-full rounded-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </Card>
      ))}
    </div>
  );
}
