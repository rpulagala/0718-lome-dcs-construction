/** Pulsing placeholder block for loading states. Decorative (aria-hidden). */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200 dark:bg-slate-800 ${className}`}
      aria-hidden
    />
  );
}

/** A large-title header skeleton (matches LargeTitle spacing). */
export function TitleSkeleton() {
  return (
    <div className="px-5 pt-8 pb-3">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-2 h-4 w-56" />
    </div>
  );
}

/** A rounded card skeleton of a given height. */
export function CardSkeleton({ className = "h-24" }: { className?: string }) {
  return <Skeleton className={`w-full rounded-2xl ${className}`} />;
}
