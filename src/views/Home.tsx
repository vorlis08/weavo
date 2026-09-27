import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Flame, Hourglass, Inbox } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { DayRituals } from '@/components/DayRituals'
import { ProgressBar, SpaceFilterSwitch, TodoRow, byUrgency } from '@/components/todo'
import { Dot, cn } from '@/components/ui'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { dateLocale, fmtDayMonth, fmtTime, isSameDay } from '@/lib/date'
import { isHot, projectStats, todayTasks, waitingTasks } from '@/lib/selectors'
import { SPACE_COLOR } from '@/lib/types'
import type { Item } from '@/lib/types'

function Panel({
  title,
  icon,
  count,
  link,
  className,
  tone,
  children,
}: {
  title: string
  icon?: ReactNode
  count?: number
  link?: { to: string; label: string }
  className?: string
  tone?: 'hot'
  children: ReactNode
}) {
  return (
    <section className={cn('rounded-xl border border-line bg-surface p-4', className)}>
      <h2
        className={cn(
          'mb-3 flex items-center gap-2 text-[12.5px] font-semibold',
          tone === 'hot' ? 'text-flame' : 'text-ink-2',
        )}
      >
        {icon}
        {title}
        {count != null && <span className="mono text-[10.5px] font-normal text-ink-3">{count}</span>}
        {link && (
          <Link to={link.to} className="ml-auto flex items-center gap-1 text-[11.5px] font-medium text-iris-2 hover:text-iris">
            {link.label}
            <ArrowRight size={11} />
          </Link>
        )}
      </h2>
      {children}
    </section>
  )
}

const Empty = ({ children }: { children: ReactNode }) => (
  <p className="text-[12.5px] text-ink-3">{children}</p>
)

export function Home() {
  const t = useT()
  const navigate = useNavigate()
  const data = useStore((s) => s.data)
  const filter = data.settings.spaceFilter
  const space = filter === 'all' ? undefined : filter
  const inFilter = (it: Item) => !space || it.space === space
  const now = new Date()

  const today = todayTasks(data, space).sort(byUrgency)
  const done = today.filter((it) => it.status === 'done').length
  const hot = Object.values(data.items).filter((it) => inFilter(it) && isHot(it)).sort(byUrgency)
  const next = today.filter((it) => it.status !== 'done' && !isHot(it)).slice(0, 6)
  const waiting = waitingTasks(data, space)
  const agenda = Object.values(data.items)
    .filter((it) => it.kind === 'event' && inFilter(it) && it.start && isSameDay(it.start, now))
    .sort((a, b) => (a.start! < b.start! ? -1 : 1))
  const upcomingAt = agenda.find((e) => !e.allDay && new Date(e.start!) >= now)?.id
  const projects = Object.values(data.projects)
    .filter((p) => !p.archived && p.due && (!space || p.space === space))
    .sort((a, b) => (a.due! < b.due! ? -1 : 1))
    .slice(0, 5)
  const unsorted = Object.values(data.items).filter((it) => it.unsorted).length

  const hour = now.getHours()
  const greeting = hour < 11 ? t.home.morning : hour < 18 ? t.home.afternoon : t.home.evening
  const name = data.settings.displayName
  const dateLine = now.toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' })
  const split = (sp: 'personal' | 'work') => {
    const all = today.filter((it) => it.space === sp)
    return `${all.filter((it) => it.status === 'done').length}/${all.length}`
  }

  return (
    <>
      <TopBar>
        <h1 className="text-[16px]">{t.nav.home}</h1>
        <div className="ml-auto">
          <SpaceFilterSwitch />
        </div>
      </TopBar>

      <div className="flex-1 overflow-y-auto px-7 py-6">
        <div className="mx-auto max-w-[1040px]">
          <div className="mb-6">
            <h2 className="text-[24px] font-semibold tracking-[-0.025em]">
              {greeting}
              {name ? `, ${name}` : ''}
            </h2>
            <p className="mt-1 text-[12.5px] text-ink-2">
              {dateLine.charAt(0).toUpperCase() + dateLine.slice(1)} ·{' '}
              {t.home.summary(agenda.length, today.filter((it) => it.status !== 'done').length)}
            </p>
          </div>

          <DayRituals />

          {unsorted > 0 && (
            <Link
              to="/triage"
              className="mb-4 flex items-center gap-2.5 rounded-xl border border-iris/25 bg-iris/8 px-4 py-2.5 text-[12.5px] text-iris-2 hover:border-iris/45"
            >
              <Inbox size={14} />
              {t.home.unsorted(unsorted)}
              <ArrowRight size={12} className="ml-auto" />
            </Link>
          )}

          <div className="grid grid-cols-12 gap-3.5">
            <Panel title={t.home.today} className="col-span-12 md:col-span-4">
              <div className="text-[34px] font-semibold leading-none tracking-[-0.03em]">
                {done}
                <span className="text-[15px] font-medium text-ink-3"> {t.home.doneOf(today.length)}</span>
              </div>
              <div className="mt-3.5 flex">
                <ProgressBar items={today} split={!space} />
              </div>
              {!space && (
                <div className="mt-3 flex gap-4 text-[12px] text-ink-2">
                  <span className="flex items-center gap-1.5">
                    <Dot color={SPACE_COLOR.personal} />
                    {t.spaces.personal} {split('personal')}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Dot color={SPACE_COLOR.work} />
                    {t.spaces.work} {split('work')}
                  </span>
                </div>
              )}
            </Panel>

            <Panel
              title={t.todo.hot}
              icon={<Flame size={14} />}
              tone="hot"
              count={hot.length}
              link={{ to: space === 'work' ? '/todo/work' : '/todo', label: t.home.openTodo }}
              className="col-span-12 md:col-span-8"
            >
              {hot.length ? (
                <div className="-mx-3 -mb-2">
                  {hot.map((it) => (
                    <TodoRow key={it.id} item={it} showSpace={!space} />
                  ))}
                </div>
              ) : (
                <Empty>{t.home.nothingHot}</Empty>
              )}
            </Panel>

            <Panel title={t.home.agenda} className="col-span-12 md:col-span-5">
              {agenda.length ? (
                <div className="flex flex-col">
                  {agenda.map((ev) => {
                    const past = !ev.allDay && new Date(ev.end ?? ev.start!) < now
                    return (
                      <button
                        key={ev.id}
                        onClick={() => navigate(`/item/${ev.id}`)}
                        className={cn(
                          'flex items-center gap-3 border-t border-line py-2 text-left text-[12.75px] first:border-t-0 hover:text-iris-2',
                          past && 'opacity-45',
                        )}
                      >
                        <span className={cn('mono w-11 shrink-0 text-[11px]', ev.id === upcomingAt ? 'text-iris-2' : 'text-ink-2')}>
                          {ev.allDay ? '—' : fmtTime(ev.start!)}
                        </span>
                        <Dot color={SPACE_COLOR[ev.space]} />
                        <span className="min-w-0 flex-1 truncate">{ev.title}</span>
                        {ev.id === upcomingAt && (
                          <span className="rounded-md bg-surface-2 px-1.5 text-[10.5px] text-ink-2">{t.home.upNext}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <Empty>{t.home.noEvents}</Empty>
              )}
            </Panel>

            <Panel
              title={t.home.next}
              link={{ to: space === 'work' ? '/todo/work' : '/todo', label: t.home.allLink }}
              className="col-span-12 md:col-span-7"
            >
              {next.length ? (
                <div className="-mx-3 -mb-2">
                  {next.map((it) => (
                    <TodoRow key={it.id} item={it} showSpace={!space} />
                  ))}
                </div>
              ) : (
                <Empty>{t.home.dayDone}</Empty>
              )}
            </Panel>

            <Panel
              title={t.todo.waiting}
              icon={<Hourglass size={13} />}
              count={waiting.length}
              className="col-span-12 md:col-span-6"
            >
              {waiting.length ? (
                <div className="-mx-3 -mb-2">
                  {waiting.map((it) => (
                    <TodoRow key={it.id} item={it} showSpace={!space} />
                  ))}
                </div>
              ) : (
                <Empty>{t.home.noWaiting}</Empty>
              )}
            </Panel>

            <Panel
              title={t.home.projects}
              link={{ to: '/projects', label: t.nav.projects }}
              className="col-span-12 md:col-span-6"
            >
              {projects.length ? (
                <div className="flex flex-col">
                  {projects.map((p) => {
                    const st = projectStats(data, p.id)
                    return (
                      <button
                        key={p.id}
                        onClick={() => navigate(`/project/${p.id}`)}
                        className="flex items-center gap-2.5 border-t border-line py-2 text-left text-[12.75px] first:border-t-0 hover:text-iris-2"
                      >
                        <Dot color={p.color} />
                        <span className="min-w-0 flex-1 truncate">{p.name}</span>
                        <span className="h-1 w-16 overflow-hidden rounded-full bg-surface-3">
                          <i className="block h-full" style={{ width: `${st.pct}%`, background: p.color }} />
                        </span>
                        <span className="mono w-14 text-right text-[11px] text-ink-3">{fmtDayMonth(p.due!)}</span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <Empty>{t.home.noProjects}</Empty>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </>
  )
}
