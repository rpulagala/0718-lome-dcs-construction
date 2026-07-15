import { Skeleton } from "@/components/portal/Skeleton";

/** Message thread skeleton — a header and alternating bubbles. */
export default function ThreadLoading() {
  return (
    <div className="flex min-h-[100dvh] flex-col" data-testid="portal-loading">
      <div className="px-5 pt-6">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="mt-3 h-6 w-48" />
      </div>
      <div className="flex-1 space-y-3 px-5 py-6">
        <Skeleton className="h-12 w-3/5 rounded-2xl" />
        <Skeleton className="ml-auto h-12 w-2/3 rounded-2xl" />
        <Skeleton className="h-16 w-3/4 rounded-2xl" />
      </div>
    </div>
  );
}
