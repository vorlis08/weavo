import type { ReactNode } from 'react'
import { useT } from '@/lib/i18n'
import { DAY_MS, addDays, startOfDay } from '@/lib/date'
import { cn } from './ui'

export interface LoomLane {
  key: string
  label: ReactNode
  /** small text at the right edge of the label column */
  meta?: ReactNode
  color: string
  start: Date
  end: Date
  /** 0–1 — the solid part of the thread */
  progress: number
  onClick?: () => void
  /** paused / greyed out */
  muted?: boolean
  /** a deadline tick at the end of the thread */
  flag?: boolean
  title?: string
}

const days = (a: Date, b: Date) => Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS)

/**
 * "Osnova" — work drawn as threads on a day axis. Each lane is one thread from
 * start to end; the solid part is what's done, the hatched part what's left.
 * A vertical needle marks today.
 */
export function Loom({
  lanes,
  from,
  to,
  labelWidth = 200,
}: {
  lanes: LoomLane[]
  from: Date
  to: Date
  labelWidth?: number
}) {
  const t = useT()
  const span = Math.max(1, days(from, to) + 1)
  const pct = (d: Date) => (days(from, d) / span) * 100
  const today = startOfDay(new Date())

  const ticks: Date[] = []
  const weekends: Date[] = []
  for (let i = 0; i < span; i++) {
    const d = addDays(from, i)
    if (d.getDay() === 1) ticks.push(d)
    if (d.getDay() === 6) weekends.push(d)
  }

  const track = (children: ReactNode) => (
    <div className="relative h-full">
      {weekends.map((d) => (
        <span
          key={d.toISOString()}
          className="absolute inset-y-0 bg-white/[0.018]"
          style={{ left: `${pct(d)}%`, width: `${(2 / span) * 100}%` }}
        />
      ))}
      {children}
    </div>
  )

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <div className="relative min-w-[720px] px-4 pb-3 pt-3.5">
        {/* axis */}
        <div className="grid h-7 border-b border-line text-xs text-ink-3" style={{ gridTemplateColumns: `${labelWidth}px 1fr` }}>
          <span />
          <div className="relative">
            {ticks.map((d) => (
              <span
                key={d.toISOString()}
                className="absolute top-0 h-full whitespace-nowrap border-l border-line pl-1.5"
                style={{ left: `${pct(d)}%` }}
              >
                {d.getDate()}. {d.getMonth() + 1}.
              </span>
            ))}
          </div>
        </div>

        <div className="relative">
          {lanes.map((l) => {
            const s = l.start < from ? from : l.start
            const e = l.end > to ? to : l.end
            const width = Math.max(((days(s, e) + 1) / span) * 100, 0.8)
            return (
              <div
                key={l.key}
                className="grid h-11 items-center border-t border-line first:border-t-0"
                style={{ gridTemplateColumns: `${labelWidth}px 1fr` }}
              >
                <button
                  onClick={l.onClick}
                  disabled={!l.onClick}
                  className="flex min-w-0 items-center gap-2.5 pr-3 text-left text-[13.5px] enabled:hover:text-iris-2"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2.5 truncate">{l.label}</span>
                  {l.meta && <span className="shrink-0 text-xs text-ink-3">{l.meta}</span>}
                </button>
                {track(
                  <>
                    <button
                      onClick={l.onClick}
                      disabled={!l.onClick}
                      title={l.title}
                      className={cn(
                        'absolute top-1/2 h-3 -translate-y-1/2 overflow-hidden rounded-full',
                        l.muted && 'saturate-[.2] brightness-75',
                      )}
                      style={{
                        left: `${pct(s)}%`,
                        width: `${width}%`,
                        background: `repeating-linear-gradient(135deg, color-mix(in oklab, ${l.color} 42%, transparent) 0 2px, transparent 2px 6px)`,
                        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${l.color} 50%, transparent)`,
                      }}
                    >
                      <i
                        className="block h-full rounded-l-full"
                        style={{ width: `${Math.min(1, Math.max(0, l.progress)) * 100}%`, background: l.color }}
                      />
                    </button>
                    {l.flag && l.end <= to && (
                      <span
                        className="absolute top-1/2 h-[22px] w-[2px] -translate-y-1/2 rounded-full"
                        style={{ left: `calc(${pct(addDays(l.end, 1))}% - 1px)`, background: l.color }}
                      />
                    )}
                  </>,
                )}
              </div>
            )
          })}

          {/* today needle */}
          {today >= from && today <= to && (
            <div className="pointer-events-none absolute inset-y-0 right-0" style={{ left: labelWidth }}>
              <span
                className="absolute inset-y-0 w-px bg-iris"
                style={{ left: `${pct(today) + 50 / span}%` }}
              >
                <span className="absolute -top-0.5 left-1.5 text-[11px] font-semibold text-iris-2">{t.project.today}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
