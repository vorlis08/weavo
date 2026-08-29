import { useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  MoreHorizontal,
  CalendarDays,
  Link2,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { SourceIcon } from '@/components/SourceIcon'
import { Badge, Button, Checkbox, Chip, Dot, Segmented, cn } from '@/components/ui'
import { WeekCalendar } from './dashboard/WeekCalendar'
import { projectById, tasks } from '@/lib/mockData'
import { useUI } from '@/lib/store'
import { useState } from 'react'
import type { TaskItem } from '@/lib/types'

const todayIds = ['t-send', 't-meridian', 't-ana', 't-slides']

const reminders = [
  {
    id: 'd1',
    icon: TriangleAlert,
    tone: 'alert' as const,
    title: 'Pricing approval overdue',
    detail: 'Nudged 2× · escalating to Slack DM at 15:00',
  },
  {
    id: 'd2',
    icon: Clock,
    tone: 'default' as const,
    title: 'Standup notes to circulate',
    detail: 'in 25 min · before 12:00',
  },
  {
    id: 'd3',
    icon: Sparkles,
    tone: 'context' as const,
    title: 'When finance replies',
    detail: 'Context trigger · resurfaces “Send pricing draft”',
  },
  {
    id: 'd4',
    icon: Clock,
    tone: 'muted' as const,
    title: 'Renew domain',
    detail: 'Snoozed to Monday',
  },
]

function TaskRow({ task }: { task: TaskItem }) {
  const navigate = useNavigate()
  const { doneOverrides, toggleDone } = useUI()
  const done = doneOverrides[task.id] ?? task.status === 'done'
  const project = projectById(task.projectId)
  return (
    <button
      onClick={() => navigate(`/item/${task.id}`)}
      className="group flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-surface-2"
    >
      <Checkbox checked={done} onChange={() => toggleDone(task.id)} />
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-[12.5px]',
          done && 'text-ink-3 line-through',
        )}
      >
        {task.title}
      </span>
      {task.source && <SourceIcon source={task.source} size={19} />}
      {project && <Dot color={project.color} />}
      <span className="mono w-9 shrink-0 text-right text-[11px] text-ink-3">
        {task.due ?? '—'}
      </span>
    </button>
  )
}

function Card({
  title,
  count,
  action,
  icon: Icon,
  children,
}: {
  title: string
  count?: React.ReactNode
  action?: React.ReactNode
  icon?: typeof Bell
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
  const openCapture = useUI((s) => s.openCapture)
  const [range, setRange] = useState<'day' | 'week' | 'month'>('week')

  const todayTasks = todayIds
    .map((id) => tasks.find((t) => t.id === id))
    .filter(Boolean) as TaskItem[]
  const flights = tasks.find((t) => t.id === 't-flights')!

  return (
    <>
      <TopBar>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" square>
            <ChevronLeft size={16} />
          </Button>
          <Button variant="ghost" square>
            <ChevronRight size={16} />
          </Button>
          <Button variant="default" className="h-[30px] text-[12px]">
            Today
          </Button>
        </div>
        <h1 className="text-[16px]">Wednesday, 27 August</h1>
        <span className="mono text-ink-3">Week 35</span>
        <div className="ml-auto flex items-center gap-3">
          <Chip className="border-iris/25 bg-iris/12 text-iris-2">
            <Sparkles size={13} strokeWidth={1.6} />3 smart suggestions
          </Chip>
          <Segmented
            options={[
              { value: 'day', label: 'Day' },
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
            ]}
            value={range}
            onChange={setRange}
          />
          <span
            className="flex h-[26px] w-[26px] items-center justify-center rounded-full text-[10px] font-semibold"
            style={{ background: '#3a3252', color: '#c9c4e4' }}
          >
            HV
          </span>
        </div>
      </TopBar>

      <div className="flex flex-1 gap-5 overflow-hidden p-[18px]">
        <WeekCalendar />

        <div className="flex w-[344px] shrink-0 flex-col gap-3.5 overflow-y-auto">
          <Card
            title="Today"
            count={<Badge>{todayTasks.length}</Badge>}
            action={
              <Button variant="ghost" square className="h-[26px] w-[26px]">
                <MoreHorizontal size={14} />
              </Button>
            }
          >
            <TaskRow task={todayTasks[0]} />
            <div className="mb-1.5 ml-[30px] mt-px flex items-center gap-1.5">
              <Link2 size={12} strokeWidth={1.7} className="shrink-0 text-rose" />
              <span className="text-[10.5px] text-ink-2">
                Blocked by <span className="text-rose">Pricing approval</span>
              </span>
            </div>
            {todayTasks.slice(1).map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
            <div className="pointer-events-none opacity-50">
              <TaskRow task={flights} />
            </div>
          </Card>

          <Card title="Reminders" icon={Bell}>
            {reminders.map((r) => (
              <div
                key={r.id}
                className={cn(
                  'mb-[7px] flex gap-2.5 rounded-lg px-2.5 py-2.5 last:mb-0',
                  r.tone === 'alert' && 'border-l-2 border-l-amber bg-amber/12',
                  r.tone === 'default' && 'bg-surface-2',
                  r.tone === 'context' && 'bg-surface-2',
                  r.tone === 'muted' && 'bg-transparent px-0',
                )}
              >
                <r.icon
                  size={15}
                  strokeWidth={1.7}
                  className={cn(
                    'mt-px shrink-0',
                    r.tone === 'alert' && 'text-amber',
                    r.tone === 'context' && 'text-iris',
                    (r.tone === 'default' || r.tone === 'muted') && 'text-ink-2',
                    r.tone === 'muted' && 'text-ink-3',
                  )}
                />
                <div>
                  <div
                    className={cn(
                      'text-[12px]',
                      r.tone === 'muted' ? 'text-ink-3' : 'text-ink',
                    )}
                  >
                    {r.title}
                  </div>
                  <div
                    className={cn(
                      'mt-0.5 text-[10.5px] leading-snug',
                      r.tone === 'muted' ? 'text-ink-3' : 'text-ink-2',
                    )}
                  >
                    {r.detail}
                  </div>
                </div>
              </div>
            ))}
          </Card>

          <Card
            title="Unsorted"
            count={<Badge tone="accent">7</Badge>}
            action={
              <button
                onClick={() => openCapture()}
                className="flex items-center gap-1 text-[11.5px] text-iris hover:text-iris-2"
              >
                Triage all <ChevronRight size={12} />
              </button>
            }
          >
            <div className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-surface-2">
              <FileText size={15} strokeWidth={1.6} className="shrink-0 text-ink-2" />
              <span className="min-w-0 flex-1 truncate text-[12.5px]">
                Bundle onboarding into Pro tier
              </span>
              <SourceIcon source="slack" size={18} />
              <span className="mono text-[11px] text-ink-3">2h</span>
            </div>
            <div className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-surface-2">
              <Checkbox checked={false} />
              <span className="min-w-0 flex-1 truncate text-[12.5px]">
                Fix broken link in footer
              </span>
              <SourceIcon source="gmail" size={18} />
              <span className="mono text-[11px] text-ink-3">4h</span>
            </div>
            <div className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-surface-2">
              <CalendarDays size={15} strokeWidth={1.6} className="shrink-0 text-sage" />
              <span className="min-w-0 flex-1 truncate text-[12.5px]">
                Coffee with recruiter — needs time
              </span>
              <span className="mono text-[11px] text-ink-3">1d</span>
            </div>
            <div className="mt-1.5 text-center">
              <span className="text-[11px] text-ink-3">+4 more</span>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
