import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { WeekGrid } from '@/components/WeekGrid'
import { Button, Dot, Segmented, cn } from '@/components/ui'
import { useStore } from '@/lib/store'
import {
  addDays,
  endOfMonth,
  fmtMonth,
  fmtTime,
  isSameDay,
  startOfMonth,
  startOfWeek,
} from '@/lib/date'

export function CalendarView() {
  const navigate = useNavigate()
  const items = useStore((s) => s.data.items)
  const projects = useStore((s) => s.data.projects)
  const weekStartsMonday = useStore((s) => s.data.settings.weekStartsMonday)
  const createItem = useStore((s) => s.createItem)

  const [mode, setMode] = useState<'week' | 'month'>('week')
  const [anchor, setAnchor] = useState(() => new Date())

  const events = useMemo(
    () => Object.values(items).filter((it) => it.kind === 'event' && it.start),
    [items],
  )

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor, weekStartsMonday), i)),
    [anchor, weekStartsMonday],
  )

  const monthCells = useMemo(() => {
    const first = startOfMonth(anchor)
    const gridStart = startOfWeek(first, weekStartsMonday)
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

  function step(dir: number) {
    setAnchor((a) => {
      const n = new Date(a)
      if (mode === 'week') n.setDate(n.getDate() + dir * 7)
      else n.setMonth(n.getMonth() + dir)
      return n
    })
  }

  const heading =
    mode === 'week'
      ? `${weekDays[0].getDate()} ${fmtMonth(weekDays[0], 'short')} – ${weekDays[6].getDate()} ${fmtMonth(weekDays[6], 'short')}`
      : `${fmtMonth(anchor)} ${anchor.getFullYear()}`

  return (
    <>
      <TopBar>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" square onClick={() => step(-1)}>
            <ChevronLeft size={16} />
          </Button>
          <Button variant="ghost" square onClick={() => step(1)}>
            <ChevronRight size={16} />
          </Button>
          <Button className="h-[30px] text-[12px]" onClick={() => setAnchor(new Date())}>
            Today
          </Button>
        </div>
        <h1 className="text-[16px]">{heading}</h1>
        <div className="ml-auto">
          <Segmented
            options={[
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
            ]}
            value={mode}
            onChange={setMode}
          />
        </div>
      </TopBar>

      {mode === 'week' ? (
        <div className="flex flex-1 overflow-hidden p-[18px]">
          <WeekGrid days={weekDays} />
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden p-[18px]">
          <div className="grid grid-cols-7 border-b border-line pb-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            {weekDays.map((d) => (
              <div key={d.toISOString()} className="text-center">
                {d.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
            ))}
          </div>
          <div className="grid flex-1 auto-rows-fr grid-cols-7 overflow-y-auto">
            {monthCells.map((cell) => {
              const inMonth = cell.getMonth() === anchor.getMonth()
              const today = isSameDay(cell, new Date())
              const dayEvents = events
                .filter((e) => isSameDay(e.start!, cell))
                .sort((a, b) => new Date(a.start!).getTime() - new Date(b.start!).getTime())
              return (
                <button
                  key={cell.toISOString()}
                  onClick={() => {
                    const start = new Date(cell)
                    start.setHours(9, 0, 0, 0)
                    const it = createItem({
                      kind: 'event',
                      title: 'New event',
                      start: start.toISOString(),
                      end: new Date(start.getTime() + 3_600_000).toISOString(),
                    })
                    navigate(`/item/${it.id}`)
                  }}
                  className={cn(
                    'group flex min-h-[92px] flex-col gap-1 border-b border-r border-line p-1.5 text-left transition-colors hover:bg-surface-2',
                    !inMonth && 'opacity-40',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold',
                      today ? 'bg-iris text-[#0b0c0e]' : 'text-ink-2',
                    )}
                  >
                    {cell.getDate()}
                  </span>
                  {dayEvents.slice(0, 3).map((e) => (
                    <span
                      key={e.id}
                      onClick={(ev) => {
                        ev.stopPropagation()
                        navigate(`/item/${e.id}`)
                      }}
                      className="flex items-center gap-1 truncate rounded px-1 py-px text-[10px] text-ink-2 hover:text-ink"
                      style={{
                        background:
                          (e.projectId && projects[e.projectId]?.color
                            ? projects[e.projectId].color
                            : '#6b7280') + '20',
                      }}
                    >
                      <Dot
                        color={
                          e.projectId && projects[e.projectId]?.color
                            ? projects[e.projectId].color
                            : '#6b7280'
                        }
                      />
                      <span className="truncate">
                        {!e.allDay && <span className="mono">{fmtTime(e.start!)} </span>}
                        {e.title}
                      </span>
                    </span>
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="px-1 text-[10px] text-ink-3">+{dayEvents.length - 3} more</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
