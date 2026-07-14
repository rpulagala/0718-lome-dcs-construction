import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { AppHeader } from "@/components/app/AppHeader";
import { WeekGrid, type CalendarDay, type PositionedEvent } from "@/components/calendar/WeekGrid";
import { listSiteVisits } from "@/lib/services/schedulingQueries";
import { assignableUsers } from "@/lib/services/requestQueries";
import {
  addDays,
  startOfWeekLocal,
  ymd,
  minutesOfDay,
  colorForIndex,
  UNASSIGNED_COLOR,
  type EmployeeColor,
} from "@/lib/domain/calendarView";

const DEFAULT_VISIT_MINUTES = 60;
const HOUR_HEIGHT = 44;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function clock(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** Working event with the fields we need to lay out and render. */
interface LayoutEvent {
  id: string;
  requestId: string;
  dayIndex: number;
  startMin: number;
  endMin: number;
  lane: number;
  lanes: number;
  color: EmployeeColor;
  timeLabel: string;
  title: string;
  subtitle: string;
  tooltip: string;
  dimmed: boolean;
}

/** Assign overlapping events to side-by-side lanes within a single day. */
function layoutDay(events: LayoutEvent[]): void {
  const sorted = events.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  let cluster: LayoutEvent[] = [];
  let clusterEnd = -1;

  const flush = () => {
    const laneEnds: number[] = [];
    for (const e of cluster) {
      let placed = false;
      for (let i = 0; i < laneEnds.length; i++) {
        if (e.startMin >= laneEnds[i]) {
          e.lane = i;
          laneEnds[i] = e.endMin;
          placed = true;
          break;
        }
      }
      if (!placed) {
        e.lane = laneEnds.length;
        laneEnds.push(e.endMin);
      }
    }
    for (const e of cluster) e.lanes = laneEnds.length;
    cluster = [];
    clusterEnd = -1;
  };

  for (const e of sorted) {
    if (cluster.length && e.startMin >= clusterEnd) flush();
    cluster.push(e);
    clusterEnd = Math.max(clusterEnd, e.endMin);
  }
  if (cluster.length) flush();
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  const weekParam = str("week");
  const base =
    weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)
      ? new Date(`${weekParam}T00:00:00`)
      : new Date();
  const weekStart = startOfWeekLocal(base);
  const weekEnd = addDays(weekStart, 7);
  const assigned = str("assigned"); // employee id, "none", or undefined (all)

  const [visits, users] = await Promise.all([
    listSiteVisits({ from: weekStart, to: weekEnd, includeInactive: true }),
    assignableUsers(),
  ]);

  // Stable color per employee (by sorted position); unassigned is grey.
  const colorByUser = new Map<string, EmployeeColor>();
  users.forEach((u, i) => colorByUser.set(u.id, colorForIndex(i)));
  const colorFor = (id: string | null) => (id ? (colorByUser.get(id) ?? UNASSIGNED_COLOR) : UNASSIGNED_COLOR);

  // Day columns for the week.
  const todayYmd = ymd(new Date());
  const dayList = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const days: CalendarDay[] = dayList.map((d) => ({
    ymd: ymd(d),
    weekday: WEEKDAYS[d.getDay()],
    dayNum: d.getDate(),
    isToday: ymd(d) === todayYmd,
  }));
  const dayIndexByYmd = new Map(days.map((d, i) => [d.ymd, i]));

  const hasUnassigned = visits.some((v) => !v.assignedToId);

  // Filter by the selected employee (or "none" = unassigned), then build events.
  const filtered = visits.filter((v) => {
    if (!assigned) return true;
    if (assigned === "none") return !v.assignedToId;
    return v.assignedToId === assigned;
  });

  let dataMinHour = 8;
  let dataMaxHour = 18;
  const layoutEvents: LayoutEvent[] = [];
  for (const v of filtered) {
    const start = v.startTime ?? v.scheduledDate;
    const dayIndex = dayIndexByYmd.get(ymd(start));
    if (dayIndex === undefined) continue;
    const startMin = minutesOfDay(start);
    const endBase = v.endTime ?? new Date(start.getTime() + DEFAULT_VISIT_MINUTES * 60_000);
    const endMin = Math.max(startMin + 20, minutesOfDay(endBase));
    dataMinHour = Math.min(dataMinHour, Math.floor(startMin / 60));
    dataMaxHour = Math.max(dataMaxHour, Math.ceil(endMin / 60));

    const dimmed = v.status === "COMPLETED" || v.status === "NO_SHOW";
    const category = v.workRequest.categoryNameSnapshot;
    const customer = v.workRequest.customer.fullName;
    const assigneeName = v.assignedTo?.name ?? "Unassigned";
    const timeLabel = `${clock(start)} – ${clock(endBase)}`;
    layoutEvents.push({
      id: v.id,
      requestId: v.workRequest.id,
      dayIndex,
      startMin,
      endMin,
      lane: 0,
      lanes: 1,
      color: colorFor(v.assignedToId),
      timeLabel,
      title: customer,
      subtitle: `${category} · ${v.workRequest.requestNumber}`,
      tooltip: `${timeLabel}\n${customer} — ${category}\n${v.workRequest.requestNumber} · ${assigneeName}${v.status !== "CONFIRMED" && v.status !== "PROPOSED" ? `\n(${v.status.replace(/_/g, " ").toLowerCase()})` : ""}`,
      dimmed,
    });
  }

  const minHour = Math.max(0, Math.min(8, dataMinHour));
  const maxHour = Math.min(24, Math.max(18, dataMaxHour));

  // Lay out overlaps per day.
  for (let di = 0; di < 7; di++) {
    layoutDay(layoutEvents.filter((e) => e.dayIndex === di));
  }

  const events: PositionedEvent[] = layoutEvents.map((e) => ({
    id: e.id,
    requestId: e.requestId,
    dayIndex: e.dayIndex,
    top: ((e.startMin - minHour * 60) / 60) * HOUR_HEIGHT,
    height: Math.max(20, ((e.endMin - e.startMin) / 60) * HOUR_HEIGHT - 2),
    leftPct: (e.lane / e.lanes) * 100,
    widthPct: 100 / e.lanes,
    color: e.color,
    timeLabel: e.timeLabel,
    title: e.title,
    subtitle: e.subtitle,
    tooltip: e.tooltip,
    dimmed: e.dimmed,
  }));

  // "Now" indicator when the current week + time is in view.
  const now = new Date();
  const nowDayIndex = dayIndexByYmd.get(ymd(now));
  const nowMin = minutesOfDay(now);
  const nowLine =
    nowDayIndex !== undefined && nowMin >= minHour * 60 && nowMin <= maxHour * 60
      ? { dayIndex: nowDayIndex, top: ((nowMin - minHour * 60) / 60) * HOUR_HEIGHT }
      : null;

  // Navigation + filter link builders (preserve the other param).
  const href = (weekYmd: string, assignedId?: string) => {
    const p = new URLSearchParams({ week: weekYmd });
    if (assignedId) p.set("assigned", assignedId);
    return `/calendar?${p.toString()}`;
  };
  const prevWeek = ymd(addDays(weekStart, -7));
  const nextWeek = ymd(addDays(weekStart, 7));
  const thisWeek = ymd(startOfWeekLocal(new Date()));
  const weekStartYmd = ymd(weekStart);

  const weekEndDay = addDays(weekStart, 6);
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const startLbl = `${MONTHS[weekStart.getMonth()]} ${weekStart.getDate()}`;
  const endLbl =
    weekStart.getMonth() === weekEndDay.getMonth()
      ? `${weekEndDay.getDate()}`
      : `${MONTHS[weekEndDay.getMonth()]} ${weekEndDay.getDate()}`;
  const rangeLabel = `${startLbl} – ${endLbl}, ${weekEndDay.getFullYear()}`;

  const navBtn =
    "flex h-9 items-center rounded-md border border-slate-300 px-3 text-sm text-slate-700 hover:bg-slate-50";

  return (
    <>
      <AppHeader user={user} />
      <main className="max-w-7xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Site visit calendar</h1>
            <p className="mt-1 text-sm text-slate-500" data-testid="week-range">{rangeLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={href(thisWeek, assigned)} className={navBtn}>Today</Link>
            <Link href={href(prevWeek, assigned)} className={navBtn} aria-label="Previous week">←</Link>
            <Link href={href(nextWeek, assigned)} className={navBtn} aria-label="Next week">→</Link>
          </div>
        </div>

        {/* Employee color legend / filter */}
        <div className="mt-5 flex flex-wrap items-center gap-2" data-testid="calendar-legend">
          <Link
            href={href(weekStartYmd)}
            data-testid="legend-all"
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
              !assigned ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            All employees
          </Link>
          {users.map((u) => {
            const c = colorByUser.get(u.id)!;
            const active = assigned === u.id;
            return (
              <Link
                key={u.id}
                href={href(weekStartYmd, u.id)}
                data-testid={`legend-${u.id}`}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium hover:bg-slate-50 ${
                  active ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-200"
                }`}
                style={{ color: c.text }}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.dot }} />
                {u.name}
              </Link>
            );
          })}
          {hasUnassigned && (
            <Link
              href={href(weekStartYmd, "none")}
              data-testid="legend-none"
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium hover:bg-slate-50 ${
                assigned === "none" ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-200 text-slate-600"
              }`}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: UNASSIGNED_COLOR.dot }} />
              Unassigned
            </Link>
          )}
        </div>

        <div className="mt-4">
          {events.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-slate-500">
              No site visits this week{assigned && assigned !== "none" ? " for this employee" : ""}.
            </div>
          ) : (
            <WeekGrid days={days} events={events} minHour={minHour} maxHour={maxHour} hourHeight={HOUR_HEIGHT} nowLine={nowLine} />
          )}
        </div>
      </main>
    </>
  );
}
