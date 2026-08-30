import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '@/components/TopBar'
import { EmptyState } from '@/components/ui'
import { GanttChartSquare } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { addDays, dateLocale, isSameDay, startOfDay } from '@/lib/date'
import type { Item } from '@/lib/types'

const DAY_W = 34
const ROW_H = 30

export function Timeline() {
  const t = useT()
  const navigate = useNavigate()
  const data = useStore((s) => s.data)

  const dated = useMemo(
    () =>
      Object.values(data.items).filter(
        (it) => (it.kind === 'task' && it.due) || (it.kind === 'event' && it.start),
      ),
    [data.items],
  )

  const { start, days } = useMemo(() => {
    const now = startOfDay(new Date())
    const s = addDays(now, -3)
    let maxT = addDays(now, 21).getTime()
    for (const it of dated) {
      const t = new Date((it.due ?? it.start)!).getTime()
      if (t > maxT) maxT = t
    }
    const total = Math.ceil((maxT - s.getTime()) / 86_400_000) + 2
    return { start: s, days: Math.min(total, 90) }
  }, [dated])

  const lanes = useMemo(() => {
    const groups = new Map<string, Item[]>()
    for (const it of dated) {
      const key = it.projectId ?? '_none'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(it)
    }
    for (const arr of groups.values())
      arr.sort((a, b) => new Date((a.due ?? a.start)!).getTime() - new Date((b.due ?? b.start)!).getTime())
    return [...groups.entries()]
  }, [dated])

  const xFor = (iso: string) =>
    ((new Date(iso).getTime() - start.getTime()) / 86_400_000) * DAY_W

  if (dated.length === 0) {
    return (
      <>
        <TopBar>
          <h1 className="text-[16px]">{t.timeline.title}</h1>
        </TopBar>
        <EmptyState
          icon={<GanttChartSquare size={22} strokeWidth={1.5} />}
          title={t.timeline.emptyTitle}
          hint={t.timeline.emptyHint}
        />
      </>
    )
  }

  const width = days * DAY_W
  const todayX = xFor(new Date().toISOString())

  return (
    <>
      <TopBar>
        <h1 className="text-[16px]">{t.timeline.title}</h1>
        <span className="mono text-ink-3">{t.timeline.lanes(lanes.length)}</span>
      </TopBar>

      <div className="flex-1 overflow-auto p-[18px]">
        <div className="relative" style={{ width: width + 160 }}>
          {/* date header */}
          <div className="sticky top-0 z-10 flex bg-bg pl-40">
            {Array.from({ length: days }, (_, i) => {
              const d = addDays(start, i)
              const today = isSameDay(d, new Date())
              return (
                <div
                  key={i}
                  className="shrink-0 border-l border-line py-1 text-center"
                  style={{ width: DAY_W }}
                >
                  <div className={`text-[9px] ${today ? 'text-iris-2' : 'text-ink-3'}`}>
                    {d.toLocaleDateString(dateLocale(), { weekday: 'narrow' })}
                  </div>
                  <div className={`text-[10px] font-medium ${today ? 'text-iris-2' : 'text-ink-2'}`}>
                    {d.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          <div
            className="pointer-events-none absolute bottom-0 top-8 z-0 w-px bg-iris/40"
            style={{ left: 160 + todayX }}
          />

          {lanes.map(([key, rows]) => {
            const project = key === '_none' ? null : data.projects[key]
            const color = project?.color ?? '#6b7280'
            return (
              <div key={key} className="mt-3">
                <div className="mb-1 flex items-center gap-2 pl-1 text-[11px] font-semibold">
                  <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                  {project?.name ?? t.common.noProject}
                </div>
                {rows.map((it) => {
                  const endIso = (it.due ?? it.end ?? it.start)!
                  const startIso = it.kind === 'event' ? it.start! : it.start ?? new Date().toISOString()
                  const x1 = Math.max(xFor(startIso), 0)
                  const x2 = Math.max(xFor(endIso), x1 + 6)
                  return (
                    <div key={it.id} className="flex items-center" style={{ height: ROW_H }}>
                      <button
                        onClick={() => navigate(`/item/${it.id}`)}
                        className="w-40 shrink-0 truncate pr-2 text-left text-[11.5px] text-ink-2 hover:text-ink"
                      >
                        {it.title}
                      </button>
                      <div className="relative h-full flex-1">
                        <button
                          onClick={() => navigate(`/item/${it.id}`)}
                          className="absolute top-1/2 -translate-y-1/2 rounded-md text-left"
                          style={{
                            left: x1,
                            width: it.kind === 'event' ? 10 : x2 - x1,
                            height: it.kind === 'event' ? 10 : 16,
                            background: it.kind === 'event' ? color : `${color}33`,
                            borderLeft: it.kind === 'event' ? undefined : `2px solid ${color}`,
                            borderRadius: it.kind === 'event' ? 999 : 5,
                          }}
                          title={it.title}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
