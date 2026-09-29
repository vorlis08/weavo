import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flame, TriangleAlert } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { dateLocale, decimalHours, fmtTime, isSameDay } from '@/lib/date'
import { eventConflicts } from '@/lib/selectors'
import { SPACE_COLOR } from '@/lib/types'
import type { Item, Space } from '@/lib/types'
import { cn } from './ui'

const ROW_H = 48

function colorFor(ev: Item, projects: Record<string, { color: string }>): string {
  if (ev.projectId && projects[ev.projectId]) return projects[ev.projectId].color
  return SPACE_COLOR[ev.space]
}

function packDay(events: Item[]) {
  const sorted = [...events].sort((a, b) => new Date(a.start!).getTime() - new Date(b.start!).getTime())
  const colEnds: number[] = []
  return sorted
    .map((ev) => {
      const s = decimalHours(ev.start!)
      const e = Math.max(decimalHours(ev.end ?? ev.start!), s + 0.25)
      let col = colEnds.findIndex((end) => end <= s + 0.001)
      if (col === -1) {
        col = colEnds.length
        colEnds.push(e)
      } else colEnds[col] = e
      return { ev, col }
    })
    .map((x, _i, arr) => ({ ...x, total: Math.max(...arr.map((a) => a.col + 1)) }))
}

/** tasks due on a day and all-day events — the band above the hour grid */
export function dayItems(items: Record<string, Item>, day: Date, space?: Space) {
  const inSpace = (it: Item) => !space || it.space === space
  const tasks = Object.values(items)
    .filter((it) => it.kind === 'task' && it.due && !it.someday && !it.parentId && inSpace(it) && isSameDay(it.due, day))
    .sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done') || Number(!!b.flame) - Number(!!a.flame))
  const allDay = Object.values(items).filter(
    (it) => it.kind === 'event' && it.allDay && it.start && inSpace(it) && isSameDay(it.start, day),
  )
  return { tasks, allDay }
}

/** a task or all-day event as a small chip */
export function DayChip({ item }: { item: Item }) {
  const navigate = useNavigate()
  const openPeek = useStore((s) => s.openPeek)
  const done = item.status === 'done'
  return (
    <button
      onClick={() => (item.kind === 'task' ? openPeek(item.id) : navigate(`/item/${item.id}`))}
      className={cn(
        'flex min-w-0 items-center gap-1.5 rounded-md bg-surface-2 px-1.5 py-[3px] text-left text-xs transition-colors hover:bg-surface-3',
        done && 'opacity-50',
      )}
      style={item.flame && !done ? { boxShadow: 'inset 2px 0 0 var(--color-flame)' } : undefined}
    >
      {item.kind === 'task' ? (
        <span
          className="h-3 w-3 shrink-0 rounded-full border-[1.5px]"
          style={{ borderColor: SPACE_COLOR[item.space], background: done ? SPACE_COLOR[item.space] : undefined }}
        />
      ) : (
        <span className="h-3 w-[3px] shrink-0 rounded-full" style={{ background: SPACE_COLOR[item.space] }} />
      )}
      <span className={cn('truncate', done && 'line-through')}>{item.title}</span>
      {item.flame && !done && <Flame size={11} className="shrink-0 text-flame" />}
    </button>
  )
}

export function WeekGrid({
  days,
  now = new Date(),
  space,
}: {
  days: Date[]
  now?: Date
  /** show only this space */
  space?: Space
}) {
  const t = useT()
  const navigate = useNavigate()
  const items = useStore((s) => s.data.items)
  const projects = useStore((s) => s.data.projects)
  const { dayStartHour, dayEndHour } = useStore((s) => s.data.settings)
  const createItem = useStore((s) => s.createItem)

  const hours = useMemo(
    () => Array.from({ length: dayEndHour - dayStartHour }, (_, i) => dayStartHour + i),
    [dayStartHour, dayEndHour],
  )
  const bodyHeight = hours.length * ROW_H

  const events = useMemo(
    () =>
      Object.values(items).filter(
        (it) => it.kind === 'event' && it.start && !it.allDay && (!space || it.space === space),
      ),
    [items, space],
  )
  const conflicts = useMemo(() => eventConflicts(events), [events])
  const bands = days.map((d) => dayItems(items, d, space))
  const hasBand = bands.some((b) => b.tasks.length || b.allDay.length)

  function addAt(day: Date, hour: number) {
    const start = new Date(day)
    start.setHours(hour, 0, 0, 0)
    const end = new Date(start.getTime() + 3_600_000)
    const it = createItem({
      kind: 'event',
      title: t.calendar.addEventTitle,
      start: start.toISOString(),
      end: end.toISOString(),
      space: space ?? 'personal',
    })
    navigate(`/item/${it.id}`)
  }

  const cols = { gridTemplateColumns: `52px repeat(${days.length}, minmax(0, 1fr))` }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-line bg-surface">
      <div className="flex min-h-0 flex-1 flex-col overflow-x-auto">
        <div className="flex min-h-0 min-w-[760px] flex-1 flex-col">
          {/* day header */}
          <div className="grid border-b border-line" style={cols}>
            <div />
            {days.map((d) => {
              const today = isSameDay(d, now)
              return (
                <div key={d.toISOString()} className="border-l border-line px-2.5 pb-2 pt-2.5">
                  <div className={cn('text-sm', today ? 'text-iris-2' : 'text-ink-3')}>
                    {d.toLocaleDateString(dateLocale(), { weekday: 'short' })}
                  </div>
                  <div className={cn('display text-2xl leading-none', today ? 'text-iris-2' : 'text-ink')}>
                    {d.getDate()}.
                  </div>
                </div>
              )
            })}
          </div>

          {/* tasks and all-day events */}
          {hasBand && (
            <div className="grid border-b border-line-2 bg-bg/60" style={cols}>
              <div className="pr-2 pt-2 text-right text-xs text-ink-3">{t.calendar.tasksBand}</div>
              {bands.map((b, i) => (
                <div key={days[i].toISOString()} className="flex min-w-0 flex-col gap-1 border-l border-line p-1.5">
                  {[...b.allDay, ...b.tasks].slice(0, 4).map((it) => (
                    <DayChip key={it.id} item={it} />
                  ))}
                  {b.tasks.length + b.allDay.length > 4 && (
                    <span className="px-1.5 text-xs text-ink-3">
                      {t.calendar.more(b.tasks.length + b.allDay.length - 4)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* hour grid */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid" style={{ ...cols, height: bodyHeight }}>
              <div>
                {hours.map((h, i) => (
                  <div key={h} className="pr-2 text-right" style={{ height: ROW_H }}>
                    <span className={cn('mono relative text-xs text-ink-3', i === 0 ? 'top-0.5' : '-top-2')}>{h}:00</span>
                  </div>
                ))}
              </div>

              {days.map((day) => {
                const packed = packDay(events.filter((e) => isSameDay(e.start!, day)))
                const today = isSameDay(day, now)
                return (
                  <div
                    key={day.toISOString()}
                    className={cn('relative border-l border-line', today && 'bg-iris/[0.035]')}
                    style={{
                      backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 ${ROW_H - 1}px, var(--color-line) ${ROW_H - 1}px ${ROW_H}px)`,
                    }}
                  >
                    {hours.map((h) => (
                      <button
                        key={h}
                        onClick={() => addAt(day, h)}
                        className="absolute inset-x-0 hover:bg-iris/[0.06]"
                        style={{ top: (h - dayStartHour) * ROW_H, height: ROW_H }}
                        aria-label={t.calendar.addAt(`${h}:00`)}
                      />
                    ))}

                    {packed.map(({ ev, col, total }) => {
                      const hex = colorFor(ev, projects)
                      const top = (decimalHours(ev.start!) - dayStartHour) * ROW_H
                      const height = Math.max((decimalHours(ev.end ?? ev.start!) - decimalHours(ev.start!)) * ROW_H - 2, 22)
                      const w = 100 / total
                      return (
                        <button
                          key={ev.id}
                          onClick={() => navigate(`/item/${ev.id}`)}
                          className="absolute overflow-hidden rounded-lg px-2 py-[5px] text-left transition-[filter] hover:brightness-125"
                          style={{
                            top: top + 1,
                            height,
                            left: `calc(${col * w}% + 4px)`,
                            width: `calc(${w}% - 7px)`,
                            background: `color-mix(in oklab, ${hex} 17%, var(--color-surface-2))`,
                            boxShadow: `inset 2px 0 0 ${hex}`,
                          }}
                        >
                          <div className="flex items-center gap-1 truncate text-xs font-semibold text-ink">
                            {conflicts[ev.id] && <TriangleAlert size={11} strokeWidth={1.8} className="shrink-0 text-rose" />}
                            {ev.title}
                          </div>
                          {height > 34 && (
                            <div className="mono mt-px text-xs text-ink-2">
                              {fmtTime(ev.start!)}
                              {ev.end ? `–${fmtTime(ev.end)}` : ''}
                            </div>
                          )}
                        </button>
                      )
                    })}

                    {today && decimalHours(now) >= dayStartHour && decimalHours(now) <= dayEndHour && (
                      <div
                        className="pointer-events-none absolute inset-x-0 z-10 h-px bg-iris"
                        style={{ top: (decimalHours(now) - dayStartHour) * ROW_H }}
                      >
                        <span className="absolute -left-1 -top-[3.5px] h-2 w-2 rounded-full bg-iris" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
