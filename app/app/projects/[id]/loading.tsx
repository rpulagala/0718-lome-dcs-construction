import { CardSkeleton, Skeleton } from "@/components/portal/Skeleton";

/** Request/project detail skeleton. */
export default function ProjectDetailLoading() {
  return (
    <div className="pb-10" data-testid="portal-loading">
      <div className="px-5 pt-6">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="mt-3 h-7 w-56" />
        <Skeleton className="mt-2 h-5 w-32" />
      </div>
      <div className="mt-5 space-y-4 px-5">
        <CardSkeleton className="h-40" />
        <CardSkeleton className="h-28" />
        <CardSkeleton className="h-24" />
      </div>
    </div>
  );
}
