import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import { useStore } from '@/lib/store'
import { decimalHours, fmtTime, isSameDay } from '@/lib/date'
import { eventConflicts } from '@/lib/selectors'
import type { Item } from '@/lib/types'
import { cn } from './ui'

const ROW_H = 52

function colorFor(ev: Item, projects: Record<string, { color: string }>): string {
  if (ev.projectId && projects[ev.projectId]) return projects[ev.projectId].color
  return '#6b7280'
}

function packDay(events: Item[]) {
  const sorted = [...events].sort(
    (a, b) => new Date(a.start!).getTime() - new Date(b.start!).getTime(),
  )
  const colEnds: number[] = []
  return sorted.map((ev) => {
    const s = decimalHours(ev.start!)
    const e = Math.max(decimalHours(ev.end ?? ev.start!), s + 0.25)
    let col = colEnds.findIndex((end) => end <= s + 0.001)
    if (col === -1) {
      col = colEnds.length
      colEnds.push(e)
    } else colEnds[col] = e
    return { ev, col }
  }).map((x, _i, arr) => ({ ...x, total: Math.max(...arr.map((a) => a.col + 1)) }))
}

export function WeekGrid({
  days,
  now = new Date(),
}: {
  days: Date[]
  now?: Date
}) {
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
    () => Object.values(items).filter((it) => it.kind === 'event' && it.start && !it.allDay),
    [items],
  )
  const conflicts = useMemo(() => eventConflicts(events), [events])

  function addAt(day: Date, hour: number) {
    const start = new Date(day)
    start.setHours(hour, 0, 0, 0)
    const end = new Date(start.getTime() + 3_600_000)
    const it = createItem({
      kind: 'event',
      title: 'New event',
      start: start.toISOString(),
      end: end.toISOString(),
    })
    navigate(`/item/${it.id}`)
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex border-b border-line">
        <div className="w-12 shrink-0" />
        {days.map((d) => {
          const today = isSameDay(d, now)
          return (
            <div
              key={d.toISOString()}
              className={cn('flex-1 border-l border-line py-2 text-center', today && 'bg-iris/[0.05]')}
            >
              <div className={cn('text-[11px] tracking-[0.04em]', today ? 'text-iris-2' : 'text-ink-3')}>
                {d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
              </div>
              {today ? (
                <span className="mt-0.5 inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-iris text-[12px] font-bold text-[#0b0c0e]">
                  {d.getDate()}
                </span>
              ) : (
                <div className="mt-0.5 text-[13px] font-semibold">{d.getDate()}</div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex flex-1 overflow-y-auto">
        <div style={{ height: bodyHeight }} className="flex w-full">
          <div className="w-12 shrink-0">
            {hours.map((h) => (
              <div key={h} className="pr-2 text-right" style={{ height: ROW_H }}>
                <span className="mono relative -top-1.5 text-[11px] text-ink-3">
                  {String(h).padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>

          {days.map((day) => {
            const dayEvents = events.filter((e) => isSameDay(e.start!, day))
            const packed = packDay(dayEvents)
            const today = isSameDay(day, now)
            return (
              <div
                key={day.toISOString()}
                className={cn('relative flex-1 border-l border-line', today && 'bg-iris/[0.03]')}
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
                    aria-label={`Add event at ${h}:00`}
                  />
                ))}

                {packed.map(({ ev, col, total }) => {
                  const hex = colorFor(ev, projects)
                  const top = (decimalHours(ev.start!) - dayStartHour) * ROW_H
                  const height = Math.max(
                    (decimalHours(ev.end ?? ev.start!) - decimalHours(ev.start!)) * ROW_H,
                    18,
                  )
                  const w = 100 / total
                  return (
                    <button
                      key={ev.id}
                      onClick={() => navigate(`/item/${ev.id}`)}
                      className="absolute overflow-hidden rounded-md px-[7px] py-[5px] text-left transition-[filter] hover:brightness-125"
                      style={{
                        top,
                        height,
                        left: `calc(${col * w}% + 5px)`,
                        width: `calc(${w}% - 6px)`,
                        background: `${hex}22`,
                        borderLeft: `2px solid ${hex}`,
                      }}
                    >
                      <div className="flex items-center gap-1 truncate text-[11px] font-medium text-ink">
                        {conflicts[ev.id] && (
                          <TriangleAlert size={11} strokeWidth={1.8} className="shrink-0 text-rose" />
                        )}
                        {ev.title}
                      </div>
                      {height > 26 && (
                        <div className="mono mt-px text-[9.5px] text-ink-2">
                          {fmtTime(ev.start!)}
                          {ev.end ? `–${fmtTime(ev.end)}` : ''}
                        </div>
                      )}
                    </button>
                  )
                })}

                {today && decimalHours(now) >= dayStartHour && decimalHours(now) <= dayEndHour && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-iris"
                    style={{ top: (decimalHours(now) - dayStartHour) * ROW_H }}
                  >
                    <span className="absolute -left-[3px] -top-[3px] h-[7px] w-[7px] rounded-full bg-iris" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
