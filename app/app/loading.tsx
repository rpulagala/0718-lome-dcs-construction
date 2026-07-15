import { TitleSkeleton, CardSkeleton } from "@/components/portal/Skeleton";

/** Home skeleton — greeting, summary card, quick actions, and a list. */
export default function HomeLoading() {
  return (
    <div className="pb-10" data-testid="portal-loading">
      <TitleSkeleton />
      <div className="space-y-4 px-5">
        <CardSkeleton className="h-36" />
        <div className="grid grid-cols-2 gap-3">
          <CardSkeleton className="h-28" />
          <CardSkeleton className="h-28" />
        </div>
        <CardSkeleton className="h-40" />
      </div>
    </div>
  );
}
