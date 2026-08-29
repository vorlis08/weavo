import { useNavigate } from 'react-router-dom'
import {
  CALENDAR_END,
  CALENDAR_START,
  NOW_HOUR,
  TODAY_INDEX,
  WEEK_DATES,
  WEEK_DAYS,
  events,
} from '@/lib/mockData'
import type { EventItem } from '@/lib/types'
import { TriangleAlert } from 'lucide-react'
import { cn } from '@/components/ui'

const ROW_H = 52
const HOURS = Array.from(
  { length: CALENDAR_END - CALENDAR_START },
  (_, i) => CALENDAR_START + i,
)

const HEX: Record<string, string> = {
  q3: '#dfa871',
  web: '#8d93ef',
  personal: '#83c79d',
  research: '#de8892',
  iris: '#8d93ef',
  amber: '#dfa871',
  rose: '#de8892',
  sage: '#83c79d',
  ink: '#61656e',
}

function colorFor(ev: EventItem) {
  return HEX[ev.projectId ?? ev.accent ?? 'ink'] ?? HEX.ink
}

function fmtRange(ev: EventItem) {
  const f = (h: number) => {
    const hh = Math.floor(h)
    const mm = Math.round((h - hh) * 60)
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  }
  return `${f(ev.startH)}–${f(ev.endH)}`
}

/** greedy column packing for overlapping events within one day */
function layout(dayEvents: EventItem[]) {
  const sorted = [...dayEvents].sort((a, b) => a.startH - b.startH)
  const cols: number[] = []
  const placed = sorted.map((ev) => {
    let col = cols.findIndex((end) => end <= ev.startH + 0.001)
    if (col === -1) {
      col = cols.length
      cols.push(ev.endH)
    } else {
      cols[col] = ev.endH
    }
    return { ev, col }
  })
  const total = cols.length || 1
  return placed.map((p) => ({ ...p, total }))
}

export function WeekCalendar() {
  const navigate = useNavigate()
  const bodyHeight = HOURS.length * ROW_H

  return (
    <section className="flex min-w-0 flex-1 flex-col self-start overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex border-b border-line">
        <div className="w-12 shrink-0" />
        <div className="flex flex-1">
          {WEEK_DAYS.map((d, i) => {
            const today = i === TODAY_INDEX
            return (
              <div
                key={d}
                className={cn(
                  'flex-1 border-l border-line py-[9px] text-center',
                  today && 'bg-iris/[0.05]',
                )}
              >
                <div
                  className={cn(
                    'text-[11px] tracking-[0.04em]',
                    today ? 'text-iris-2' : 'text-ink-3',
                  )}
                >
                  {d.toUpperCase()}
                </div>
                {today ? (
                  <span className="mt-0.5 inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-iris text-[12px] font-bold text-[#0b0c0e]">
                    {WEEK_DATES[i]}
                  </span>
                ) : (
                  <div className="mt-0.5 text-[13px] font-semibold">{WEEK_DATES[i]}</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex overflow-hidden" style={{ height: bodyHeight }}>
        <div className="w-12 shrink-0">
          {HOURS.map((h) => (
            <div key={h} className="pr-2 text-right" style={{ height: ROW_H }}>
              <span className="mono relative -top-1.5 text-[11px] text-ink-3">
                {String(h).padStart(2, '0')}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-1">
          {WEEK_DAYS.map((_, dayIdx) => {
            const dayEvents = events.filter(
              (e) => e.day === dayIdx && !e.needsTime,
            )
            const placed = layout(dayEvents.filter((e) => !e.milestone))
            const milestones = dayEvents.filter((e) => e.milestone)
            return (
              <div
                key={dayIdx}
                className={cn(
                  'relative flex-1 border-l border-line',
                  dayIdx === TODAY_INDEX && 'bg-iris/[0.04]',
                )}
                style={{
                  backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 ${ROW_H - 1}px, var(--color-line) ${ROW_H - 1}px ${ROW_H}px)`,
                }}
              >
                {placed.map(({ ev, col, total }) => {
                  const hex = colorFor(ev)
                  const top = (ev.startH - CALENDAR_START) * ROW_H
                  const height = Math.max((ev.endH - ev.startH) * ROW_H, 18)
                  const widthPct = 100 / total
                  return (
                    <button
                      key={ev.id}
                      onClick={() => navigate(`/item/${ev.id}`)}
                      className="absolute overflow-hidden rounded-md px-[7px] py-[5px] text-left transition-[filter] hover:brightness-125"
                      style={{
                        top,
                        height,
                        left: `calc(${col * widthPct}% + 5px)`,
                        width: `calc(${widthPct}% - 6px)`,
                        background: `${hex}1f`,
                        borderLeft: `2px solid ${hex}`,
                      }}
                    >
                      <div className="flex items-center gap-1 truncate text-[11px] font-medium text-ink">
                        {ev.conflict && (
                          <TriangleAlert
                            size={11}
                            strokeWidth={1.8}
                            className="shrink-0 text-rose"
                          />
                        )}
                        {ev.title}
                      </div>
                      {height > 26 && (
                        <div className="mono mt-px text-[9.5px] text-ink-2">{fmtRange(ev)}</div>
                      )}
                    </button>
                  )
                })}

                {milestones.map((ev) => {
                  const hex = colorFor(ev)
                  const top = (ev.startH - CALENDAR_START) * ROW_H
                  return (
                    <div
                      key={ev.id}
                      className="absolute left-[5px] right-[5px] flex items-center gap-1.5"
                      style={{ top }}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full border-2"
                        style={{ borderColor: hex }}
                      />
                      <span className="text-[10.5px]" style={{ color: hex }}>
                        {ev.title} · {String(Math.floor(ev.startH)).padStart(2, '0')}:00
                      </span>
                    </div>
                  )
                })}

                {dayIdx === TODAY_INDEX && (
                  <div
                    className="absolute inset-x-0 z-10 h-0.5 bg-iris"
                    style={{ top: (NOW_HOUR - CALENDAR_START) * ROW_H }}
                  >
                    <span className="absolute -left-[3px] -top-[3px] h-[7px] w-[7px] rounded-full bg-iris" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
