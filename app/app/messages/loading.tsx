import { TitleSkeleton, CardSkeleton } from "@/components/portal/Skeleton";

/** Messages list skeleton. */
export default function MessagesLoading() {
  return (
    <div className="pb-10" data-testid="portal-loading">
      <TitleSkeleton />
      <div className="mx-5 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <CardSkeleton key={i} className="h-16" />
        ))}
      </div>
    </div>
  );
}
