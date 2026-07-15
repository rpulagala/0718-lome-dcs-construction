/** iOS-style large-title header for portal screens. */
export function LargeTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="px-5 pt-8 pb-3">
      <h1 className="text-[28px] font-bold leading-tight tracking-tight text-brand-ink">{title}</h1>
      {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
    </header>
  );
}
