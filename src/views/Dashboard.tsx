import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Clock,
  Inbox,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { Avatar, Button, Badge, Chip, Segmented } from '@/components/ui'
import { CompletedRow, KindIcon, TaskRow } from '@/components/items'
import { WeekGrid } from '@/components/WeekGrid'
import { useStore } from '@/lib/store'
import { addDays, fmtDayMonth, fmtLongDate, fmtTime, startOfWeek } from '@/lib/date'
import { buildDigest, eventConflicts, reminderDueAt } from '@/lib/selectors'
import { makeSampleData } from '@/lib/sampleData'

function Card({
  title,
  icon: Icon,
  count,
  action,
  children,
}: {
  title: string
  icon?: typeof Bell
  count?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-line bg-surface px-[15px] py-3.5">
      <div className="mb-2.5 flex items-center gap-2">
        {Icon && <Icon size={13} strokeWidth={1.6} className="text-ink-2" />}
        <h3 className="text-[14.5px]">{title}</h3>
        {count}
        <div className="ml-auto">{action}</div>
      </div>
      {children}
    </section>
  )
}

export function Dashboard() {
  const navigate = useNavigate()
  const data = useStore((s) => s.data)
  const replaceAll = useStore((s) => s.replaceAll)
  const openCapture = useStore((s) => s.openCapture)
  const snoozeReminder = useStore((s) => s.snoozeReminder)
  const updateReminder = useStore((s) => s.updateReminder)

  const weekStartsMonday = data.settings.weekStartsMonday
  const [weekOffset, setWeekOffset] = useState(0)
  const [mode, setMode] = useState<'day' | 'week'>('week')

  const today = new Date()
  const baseWeek = startOfWeek(today, weekStartsMonday)
  const weekStart = addDays(baseWeek, weekOffset * 7)
  const days = useMemo(() => {
    if (mode === 'day') {
      const d = weekOffset === 0 ? today : weekStart
      return [new Date(d)]
    }
    return Array.from({ length: 5 }, (_, i) => addDays(weekStart, i))
  }, [mode, weekOffset, weekStart]) // eslint-disable-line react-hooks/exhaustive-deps

  const digest = useMemo(() => buildDigest(data, today), [data]) // eslint-disable-line react-hooks/exhaustive-deps
  const itemCount = Object.keys(data.items).length

  const conflictCount = useMemo(() => {
    const evs = Object.values(data.items).filter((i) => i.kind === 'event' && i.start && !i.allDay)
    return new Set(Object.keys(eventConflicts(evs))).size
  }, [data.items])

  const ringing = useMemo(
    () =>
      Object.values(data.reminders)
        .filter((r) => r.firedAt && !r.done)
        .map((r) => ({ r, item: data.items[r.itemId] }))
        .filter((x) => x.item),
    [data.reminders, data.items],
  )
  const upcomingReminders = useMemo(() => {
    const now = Date.now()
    return Object.values(data.reminders)
      .filter((r) => !r.firedAt && !r.done)
      .map((r) => ({ r, item: data.items[r.itemId], at: data.items[r.itemId] ? reminderDueAt(r, data.items[r.itemId]) : null }))
      .filter((x) => x.item && x.at && x.at > now && x.at < now + 36 * 3600_000)
      .sort((a, b) => (a.at! - b.at!))
      .slice(0, 3)
  }, [data.reminders, data.items])

  const title = mode === 'day'
    ? fmtLongDate(days[0])
    : `${fmtDayMonth(days[0])} – ${fmtDayMonth(days[days.length - 1])}`

  if (itemCount === 0) {
    return (
      <>
        <TopBar>
          <h1 className="text-[16px]">Dashboard</h1>
        </TopBar>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-iris/12 text-iris">
            <Sparkles size={24} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-[17px]">Nothing captured yet</h2>
            <p className="mt-1.5 max-w-[360px] text-[13px] leading-relaxed text-ink-2">
              Weavo keeps events, tasks, and notes in one place. Capture your first thing —
              type something like “Call plumber tomorrow 9am”.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="accent" onClick={() => openCapture()}>
              Quick capture
            </Button>
            <Button onClick={() => replaceAll(makeSampleData())}>Load example data</Button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" square onClick={() => setWeekOffset((w) => w - 1)}>
            <ChevronLeft size={16} />
          </Button>
          <Button variant="ghost" square onClick={() => setWeekOffset((w) => w + 1)}>
            <ChevronRight size={16} />
          </Button>
          <Button className="h-[30px] text-[12px]" onClick={() => setWeekOffset(0)}>
            Today
          </Button>
        </div>
        <h1 className="text-[16px]">{title}</h1>
        <div className="ml-auto flex items-center gap-3">
          {conflictCount > 0 && (
            <Chip className="border-rose/25 bg-rose/12 text-rose" onClick={() => navigate('/calendar')}>
              <TriangleAlert size={12} strokeWidth={1.7} />
              {conflictCount} time conflict{conflictCount > 1 ? 's' : ''}
            </Chip>
          )}
          <Segmented
            options={[
              { value: 'day', label: 'Day' },
              { value: 'week', label: 'Week' },
            ]}
            value={mode}
            onChange={setMode}
          />
          {data.settings.displayName && <Avatar name={data.settings.displayName} size={26} />}
        </div>
      </TopBar>

      <div className="flex flex-1 gap-5 overflow-hidden p-[18px]">
        <WeekGrid days={days} />

        <div className="flex w-[344px] shrink-0 flex-col gap-3.5 overflow-y-auto">
          <Card
            title="Today"
            count={<Badge>{digest.dueToday.length + digest.overdue.length}</Badge>}
          >
            {digest.overdue.length === 0 && digest.dueToday.length === 0 && (
              <p className="px-1.5 py-3 text-[12px] text-ink-3">Nothing due today. Nice.</p>
            )}
            {digest.overdue.map((it) => (
              <TaskRow key={it.id} item={it} />
            ))}
            {digest.dueToday.map((it) => (
              <TaskRow key={it.id} item={it} />
            ))}
            {digest.completedToday.length > 0 && (
              <div className="mt-1.5 border-t border-line pt-1.5">
                {digest.completedToday.slice(0, 3).map((it) => (
                  <CompletedRow key={it.id} item={it} />
                ))}
              </div>
            )}
          </Card>

          {(ringing.length > 0 || upcomingReminders.length > 0) && (
            <Card title="Reminders" icon={Bell}>
              {ringing.map(({ r, item }) => (
                <div key={r.id} className="mb-[7px] rounded-lg border-l-2 border-l-amber bg-amber/12 px-2.5 py-2.5">
                  <button
                    onClick={() => navigate(`/item/${item.id}`)}
                    className="block w-full text-left text-[12px] text-ink"
                  >
                    {item.title}
                  </button>
                  <div className="mt-0.5 text-[10.5px] text-ink-2">{r.note || 'Reminder'}</div>
                  <div className="mt-1.5 flex gap-1.5">
                    <button
                      onClick={() => snoozeReminder(r.id, 60)}
                      className="rounded-md bg-surface-3 px-2 py-1 text-[10.5px] text-ink-2 hover:text-ink"
                    >
                      Snooze 1h
                    </button>
                    <button
                      onClick={() => updateReminder(r.id, { done: true })}
                      className="rounded-md bg-surface-3 px-2 py-1 text-[10.5px] text-ink-2 hover:text-ink"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
              {upcomingReminders.map(({ r, item, at }) => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/item/${item.id}`)}
                  className="mb-[7px] flex w-full gap-2.5 rounded-lg bg-surface-2 px-2.5 py-2.5 text-left last:mb-0"
                >
                  <Clock size={14} strokeWidth={1.6} className="mt-px shrink-0 text-ink-2" />
                  <div>
                    <div className="text-[12px] text-ink">{item.title}</div>
                    <div className="mt-px text-[10.5px] text-ink-3">
                      {at && fmtTime(new Date(at))} · {r.note || 'reminder'}
                    </div>
                  </div>
                </button>
              ))}
            </Card>
          )}

          <Card
            title="Unsorted"
            count={digest.unsorted.length > 0 ? <Badge tone="accent">{digest.unsorted.length}</Badge> : undefined}
            action={
              digest.unsorted.length > 0 && (
                <Link to="/triage" className="flex items-center gap-1 text-[11.5px] text-iris hover:text-iris-2">
                  Triage <ChevronRight size={12} />
                </Link>
              )
            }
          >
            {digest.unsorted.length === 0 ? (
              <p className="px-1.5 py-2 text-[12px] text-ink-3">Inbox zero.</p>
            ) : (
              digest.unsorted.slice(0, 4).map((it) => (
                <button
                  key={it.id}
                  onClick={() => navigate(`/item/${it.id}`)}
                  className="flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left hover:bg-surface-2"
                >
                  <span className="text-ink-3">
                    <KindIcon kind={it.kind} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12.5px]">{it.title}</span>
                </button>
              ))
            )}
          </Card>

          {digest.stale.length > 0 && (
            <Card title="Stale" icon={Inbox}>
              <p className="mb-1.5 px-1.5 text-[11px] text-ink-3">
                Open, no due date, untouched for a week.
              </p>
              {digest.stale.slice(0, 4).map((it) => (
                <TaskRow key={it.id} item={it} />
              ))}
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
