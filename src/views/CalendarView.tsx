import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Page } from '@/components/Page'
import { DayChip, WeekGrid, dayItems } from '@/components/WeekGrid'
import { SpaceFilterSwitch, TodoList } from '@/components/todo'
import { Button, Segmented, cn } from '@/components/ui'
import { useStore } from '@/lib/store'
import { eventsOn as eventsOnDay } from '@/lib/recur'
import { useT } from '@/lib/i18n'
import {
  addDays,
  dateLocale,
  endOfMonth,
  fmtLongDate,
  fmtMonth,
  fmtShort,
  fmtTime,
  isSameDay,
  startOfMonth,
  startOfWeek,
} from '@/lib/date'
import { SPACE_COLOR } from '@/lib/types'
import type { Item } from '@/lib/types'

/** ISO week number, for the eyebrow */
function weekNumber(d: Date) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = x.getUTCDay() || 7
  x.setUTCDate(x.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(x.getUTCFullYear(), 0, 1))
  return Math.ceil(((x.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
}

export function CalendarView() {
  const t = useT()
  const openPeek = useStore((s) => s.openPeek)
  const data = useStore((s) => s.data)
  const items = data.items
  const projects = data.projects
  const weekStartsMonday = useStore((s) => s.data.settings.weekStartsMonday)
  const filter = useStore((s) => s.data.settings.spaceFilter)
  const space = filter === 'all' ? undefined : filter

  const [mode, setMode] = useState<'week' | 'month'>('week')
  const [anchor, setAnchor] = useState(() => new Date())

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor, weekStartsMonday), i)),
    [anchor, weekStartsMonday],
  )
  const monthCells = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(anchor), weekStartsMonday)
    const last = endOfMonth(anchor)
    const cells: Date[] = []
    let d = gridStart
    while (d <= last || cells.length % 7 !== 0) {
      cells.push(new Date(d))
      d = addDays(d, 1)
      if (cells.length > 42) break
    }
    return cells
  }, [anchor, weekStartsMonday])

  const eventsOn = (d: Date) => eventsOnDay(data, d, space).filter((e) => !e.allDay)

  function step(dir: number) {
    setAnchor((a) => {
      const n = new Date(a)
      if (mode === 'week') n.setDate(n.getDate() + dir * 7)
      else n.setMonth(n.getMonth() + dir)
      return n
    })
  }

  const eyebrow =
    mode === 'week'
      ? `${fmtShort(weekDays[0])} – ${fmtShort(weekDays[6])} · ${t.calendar.weekNo(weekNumber(weekDays[0]))}`
      : `${fmtMonth(anchor)} ${anchor.getFullYear()}`

  const actions = (
    <>
      <SpaceFilterSwitch />
      <Segmented
        options={[
          { value: 'week', label: t.common.week },
          { value: 'month', label: t.common.month },
        ]}
        value={mode}
        onChange={setMode}
      />
      <span className="flex items-center gap-1">
        <Button variant="ghost" square onClick={() => step(-1)} aria-label={t.calendar.prev}>
          <ChevronLeft size={17} />
        </Button>
        <Button onClick={() => setAnchor(new Date())}>{t.calendar.today}</Button>
        <Button variant="ghost" square onClick={() => step(1)} aria-label={t.calendar.next}>
          <ChevronRight size={17} />
        </Button>
      </span>
    </>
  )

  const agendaDays = mode === 'week' ? weekDays : monthCells.filter((c) => c.getMonth() === anchor.getMonth())

  return (
    <Page eyebrow={eyebrow} title={t.calendar.title} actions={actions} fill>
      {/* phones: the range as a list of days */}
      <div className="flex-1 overflow-y-auto md:hidden">
        <Agenda days={agendaDays} eventsOn={eventsOn} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col max-md:hidden">
        {mode === 'week' ? (
          <WeekGrid days={weekDays} space={space} />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-line bg-surface">
            <div className="grid grid-cols-7 border-b border-line">
              {weekDays.map((d) => (
                <div key={d.toISOString()} className="border-l border-line px-2.5 py-2 text-sm text-ink-3 first:border-l-0">
                  {d.toLocaleDateString(dateLocale(), { weekday: 'short' })}
                </div>
              ))}
            </div>
            <div className="grid flex-1 auto-rows-fr grid-cols-7 overflow-y-auto">
              {monthCells.map((cell) => {
                const inMonth = cell.getMonth() === anchor.getMonth()
                const today = isSameDay(cell, new Date())
                const evs = eventsOn(cell)
                const { tasks, allDay, notes } = dayItems(items, cell, space)
                const all: Item[] = [...allDay, ...evs, ...notes, ...tasks]
                return (
                  <div
                    key={cell.toISOString()}
                    className={cn(
                      'flex min-h-[104px] min-w-0 flex-col gap-1 border-b border-l border-line p-1.5 [&:nth-child(7n+1)]:border-l-0',
                      !inMonth && 'opacity-40',
                      today && 'bg-iris/[0.04]',
                    )}
                  >
                    <span
                      className={cn(
                        'display mb-0.5 flex h-6 w-6 items-center justify-center rounded-full text-sm',
                        today ? 'bg-iris text-iris-ink' : 'text-ink-2',
                      )}
                    >
                      {cell.getDate()}
                    </span>
                    {all.slice(0, 3).map((it) =>
                      it.kind === 'task' || it.kind === 'note' || it.allDay ? (
                        <DayChip key={it.id} item={it} />
                      ) : (
                        <button
                          key={it.id}
                          onClick={() => openPeek(it.id)}
                          className="flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-[3px] text-left text-xs text-ink-2 hover:bg-surface-2 hover:text-ink"
                        >
                          <span
                            className="h-3 w-[3px] shrink-0 rounded-full"
                            style={{ background: it.projectId && projects[it.projectId] ? projects[it.projectId].color : SPACE_COLOR[it.space] }}
                          />
                          <span className="mono shrink-0 text-ink-3">{fmtTime(it.start!)}</span>
                          <span className="truncate">{it.title}</span>
                        </button>
                      ),
                    )}
                    {all.length > 3 && <span className="px-1.5 text-xs text-ink-3">{t.calendar.more(all.length - 3)}</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </Page>
  )
}

/** a day-by-day list of events and tasks — the calendar on phones */
function Agenda({ days, eventsOn }: { days: Date[]; eventsOn: (d: Date) => Item[] }) {
  const t = useT()
  const openPeek = useStore((s) => s.openPeek)
  const items = useStore((s) => s.data.items)
  const filter = useStore((s) => s.data.settings.spaceFilter)
  const space = filter === 'all' ? undefined : filter
  const now = new Date()
  const sections = days
    .map((d) => ({ d, events: eventsOn(d), ...dayItems(items, d, space) }))
    .filter((s) => s.events.length || s.tasks.length || s.allDay.length || s.notes.length)

  if (!sections.length) return <p className="py-6 text-base text-ink-3">{t.calendar.empty}</p>
  return (
    <div>
      {sections.map(({ d, events, tasks, allDay, notes }) => (
        <section key={d.toISOString()} className="mb-7">
          <h2 className={cn('display mb-2 px-1 text-lg', isSameDay(d, now) ? 'text-iris-2' : 'text-ink')}>
            {isSameDay(d, now) ? t.calendar.today : isSameDay(d, addDays(now, 1)) ? t.calendar.tomorrow : fmtLongDate(d)}
          </h2>
          {[...allDay, ...events, ...notes].length > 0 && (
            <div className="mb-1.5 flex flex-col">
              {[...allDay, ...events, ...notes].map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => openPeek(ev.id)}
                  className="grid min-h-10 grid-cols-[48px_2px_1fr] items-center gap-3 rounded-lg px-1 text-left text-base"
                >
                  <span className="mono text-right text-sm text-ink-3">{ev.allDay || !ev.start ? '—' : fmtTime(ev.start)}</span>
                  <span className="h-5 rounded-full" style={{ background: SPACE_COLOR[ev.space] }} />
                  <span className="truncate">{ev.title}</span>
                </button>
              ))}
            </div>
          )}
          <TodoList items={tasks} showSpace={!space} />
        </section>
      ))}
    </div>
  )
}
