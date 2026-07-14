import Link from "next/link";
import type { EmployeeColor } from "@/lib/domain/calendarView";

export interface CalendarDay {
  ymd: string;
  weekday: string; // "Sun"
  dayNum: number;
  isToday: boolean;
}

export interface PositionedEvent {
  id: string;
  requestId: string;
  dayIndex: number;
  top: number;
  height: number;
  leftPct: number;
  widthPct: number;
  color: EmployeeColor;
  timeLabel: string;
  title: string;
  subtitle: string;
  tooltip: string;
  dimmed: boolean;
}

interface Props {
  days: CalendarDay[];
  events: PositionedEvent[];
  minHour: number;
  maxHour: number;
  hourHeight?: number;
  nowLine?: { dayIndex: number; top: number } | null;
}

function hourLabel(h: number): string {
  const period = h < 12 || h === 24 ? "AM" : "PM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display} ${period}`;
}

/**
 * A Google-style week grid: a time gutter plus seven day columns with site
 * visits positioned by time and colored per employee. Pure render — all layout
 * (day/lane/position) is computed by the caller.
 */
export function WeekGrid({ days, events, minHour, maxHour, hourHeight = 44, nowLine }: Props) {
  const bodyHeight = (maxHour - minHour) * hourHeight;
  const gridCols = "56px repeat(7, minmax(116px, 1fr))";
  const hours = Array.from({ length: maxHour - minHour }, (_, i) => minHour + i);
  const hourLines = `repeating-linear-gradient(to bottom, #eef2f6 0px, #eef2f6 1px, transparent 1px, transparent ${hourHeight}px)`;

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white" data-testid="calendar-grid">
      <div className="min-w-[820px]">
        {/* Header */}
        <div className="grid border-b border-slate-200" style={{ gridTemplateColumns: gridCols }}>
          <div className="border-r border-slate-100" />
          {days.map((d) => (
            <div key={d.ymd} className="border-l border-slate-100 px-2 py-2 text-center">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{d.weekday}</div>
              <div
                className={
                  d.isToday
                    ? "mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-600 text-sm font-semibold text-white"
                    : "mt-1 text-sm font-semibold text-slate-800"
                }
              >
                {d.dayNum}
              </div>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="grid" style={{ gridTemplateColumns: gridCols, height: bodyHeight }}>
          {/* Time gutter */}
          <div className="relative border-r border-slate-100">
            {hours.map((h, i) => (
              <div
                key={h}
                className="absolute right-1 -translate-y-1/2 text-[10px] text-slate-400"
                style={{ top: i * hourHeight }}
              >
                {i === 0 ? "" : hourLabel(h)}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d, di) => (
            <div
              key={d.ymd}
              className="relative border-l border-slate-100"
              style={{ background: hourLines }}
            >
              {nowLine && nowLine.dayIndex === di && (
                <div className="absolute left-0 right-0 z-10" style={{ top: nowLine.top }}>
                  <div className="h-px bg-red-500" />
                  <div className="absolute -left-0.5 -top-1 h-2 w-2 rounded-full bg-red-500" />
                </div>
              )}
              {events
                .filter((e) => e.dayIndex === di)
                .map((e) => (
                  <Link
                    key={e.id}
                    href={`/requests/${e.requestId}`}
                    data-testid="calendar-event"
                    title={e.tooltip}
                    className="absolute overflow-hidden rounded-md border px-1.5 py-1 text-[11px] leading-tight shadow-sm transition hover:z-20 hover:shadow"
                    style={{
                      top: e.top,
                      height: e.height,
                      left: `calc(${e.leftPct}% + 2px)`,
                      width: `calc(${e.widthPct}% - 4px)`,
                      backgroundColor: e.color.bg,
                      borderColor: e.color.border,
                      color: e.color.text,
                      opacity: e.dimmed ? 0.6 : 1,
                    }}
                  >
                    <div className="truncate font-semibold">
                      <span className={e.dimmed ? "line-through" : ""}>{e.title}</span>
                    </div>
                    <div className="truncate opacity-80">{e.timeLabel}</div>
                    {e.height > 44 && <div className="truncate opacity-70">{e.subtitle}</div>}
                  </Link>
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
