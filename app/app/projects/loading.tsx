import { TitleSkeleton, CardSkeleton } from "@/components/portal/Skeleton";

/** Projects list skeleton — header + a few request rows. */
export default function ProjectsLoading() {
  return (
    <div className="pb-10" data-testid="portal-loading">
      <TitleSkeleton />
      <div className="space-y-3 px-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} className="h-20" />
        ))}
      </div>
    </div>
  );
}
