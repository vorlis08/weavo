import { Fragment } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Flame, Hourglass, Inbox } from 'lucide-react'
import { Card, Page } from '@/components/Page'
import { DayRituals } from '@/components/DayRituals'
import { SpaceFilterSwitch, TodoSection, byUrgency } from '@/components/todo'
import { ProjectGlyph } from '@/components/ui'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { eventsOn } from '@/lib/recur'
import { fmtCountdown, fmtLongDate, fmtShort, fmtTime } from '@/lib/date'
import { isHot, projectStats, todayTasks, waitingTasks } from '@/lib/selectors'
import { SPACE_COLOR } from '@/lib/types'
import type { Item, Space } from '@/lib/types'

const MoreLink = ({ to, children }: { to: string; children: string }) => (
  <Link to={to} className="flex items-center gap-1 text-ink-3 hover:text-ink">
    {children}
    <ArrowRight size={13} />
  </Link>
)

export function Home() {
  const t = useT()
  const navigate = useNavigate()
  const openPeek = useStore((s) => s.openPeek)
  const data = useStore((s) => s.data)
  const filter = data.settings.spaceFilter
  const space = filter === 'all' ? undefined : filter
  const inFilter = (it: { space: Space }) => !space || it.space === space
  const now = new Date()

  const today = todayTasks(data, space).sort(byUrgency)
  const open = today.filter((it) => it.status !== 'done')
  const hot = Object.values(data.items).filter((it) => inFilter(it) && isHot(it)).sort(byUrgency)
  const next = open.filter((it) => !isHot(it)).slice(0, 6)
  const waiting = waitingTasks(data, space)
  const agenda = eventsOn(data, now, space)
  const projects = Object.values(data.projects)
    .filter((p) => p.status === 'active' && p.due && inFilter(p))
    .sort((a, b) => (a.due! < b.due! ? -1 : 1))
    .slice(0, 5)
  const unsorted = Object.values(data.items).filter((it) => it.unsorted).length

  const split = (sp: Space) => {
    const all = today.filter((it) => it.space === sp)
    return { done: all.filter((it) => it.status === 'done').length, total: all.length }
  }
  // where the "now" needle sits among today's events
  const nowIndex = agenda.findIndex((e) => !e.allDay && new Date(e.start!) > now)

  return (
    <Page
      eyebrow={fmtLongDate(now)}
      title={t.nav.home}
      lede={t.home.lede(agenda.length, open.length, hot.length)}
      actions={<SpaceFilterSwitch />}
    >
      <DayRituals />

      {unsorted > 0 && (
        <Link
          to="/triage"
          className="mb-6 flex items-center gap-2.5 rounded-md border border-line-2 px-3 py-2 text-base text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <Inbox size={16} />
          {t.home.unsorted(unsorted)}
          <ArrowRight size={14} className="ml-auto" />
        </Link>
      )}

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div>
          <TodoSection
            title={t.todo.hot}
            icon={<Flame size={14} />}
            hot
            items={hot}
            empty={t.home.nothingHot}
            showSpace={!space}
          />
          <TodoSection title={t.home.next} items={next} empty={t.home.dayDone} showSpace={!space} ctx="today" />
          <TodoSection
            title={t.todo.waiting}
            icon={<Hourglass size={14} />}
            items={waiting}
            showSpace={!space}
          />
        </div>

        <div className="flex flex-col gap-3">
          <Card title={t.home.today}>
            <div className="display flex items-baseline gap-2">
              <b className="text-4xl font-semibold">{today.length - open.length}</b>
              <span className="text-lg text-ink-3">{t.home.doneOf(today.length)}</span>
            </div>
            <div className="mt-4 flex flex-col gap-2.5">
              {(['personal', 'work'] as Space[])
                .filter((sp) => !space || sp === space)
                .map((sp) => {
                  const s = split(sp)
                  return (
                    <div key={sp} className="grid grid-cols-[64px_1fr_40px] items-center gap-2.5 text-sm text-ink-2">
                      <span>{t.spaces[sp]}</span>
                      <span className="h-[3px] overflow-hidden rounded-full bg-surface-3">
                        <i
                          className="block h-full rounded-full transition-[width] duration-500"
                          style={{ width: `${s.total ? (s.done / s.total) * 100 : 0}%`, background: SPACE_COLOR[sp] }}
                        />
                      </span>
                      <span className="mono text-right text-ink-3">
                        {s.done}/{s.total}
                      </span>
                    </div>
                  )
                })}
            </div>
          </Card>

          <Card title={t.home.agenda} action={<MoreLink to="/calendar">{t.nav.calendar}</MoreLink>}>
            {agenda.length ? (
              <div className="flex flex-col">
                {agenda.map((ev, i) => (
                  <Fragment key={ev.id}>
                    {i === nowIndex && <NowNeedle />}
                    <AgendaRow item={ev} onOpen={() => openPeek(ev.id)} />
                  </Fragment>
                ))}
                {nowIndex === -1 && <NowNeedle />}
              </div>
            ) : (
              <p className="text-base text-ink-3">{t.home.noEvents}</p>
            )}
          </Card>

          <Card title={t.home.projects} action={<MoreLink to="/projects">{t.home.allLink}</MoreLink>}>
            {projects.length ? (
              <div className="flex flex-col gap-3">
                {projects.map((p) => {
                  const st = projectStats(data, p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/project/${p.id}`)}
                      className="group grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 text-left"
                    >
                      <span className="flex min-w-0 items-center gap-2.5 text-base group-hover:text-ink">
                        <ProjectGlyph color={p.color} />
                        <span className="truncate">{p.name}</span>
                      </span>
                      <span className="text-sm text-ink-3">
                        {fmtShort(p.due!)} · {fmtCountdown(p.due!)}
                      </span>
                      <span className="col-span-2 h-[3px] overflow-hidden rounded-full bg-surface-3">
                        <i className="block h-full rounded-full" style={{ width: `${st.pct}%`, background: p.color }} />
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-base text-ink-3">{t.home.noProjects}</p>
            )}
          </Card>
        </div>
      </div>
    </Page>
  )
}

function NowNeedle() {
  return (
    <div className="my-0.5 grid grid-cols-[48px_1fr] items-center gap-3">
      <span className="mono text-right text-xs font-semibold text-iris-2">{fmtTime(new Date())}</span>
      <i className="relative h-px bg-iris before:absolute before:-left-[3px] before:-top-[3px] before:h-[7px] before:w-[7px] before:rounded-full before:bg-iris" />
    </div>
  )
}

function AgendaRow({ item, onOpen }: { item: Item; onOpen: () => void }) {
  const t = useT()
  const past = !item.allDay && new Date(item.end ?? item.start!) < new Date()
  const project = useStore((s) => (item.projectId ? s.data.projects[item.projectId] : undefined))
  return (
    <button
      onClick={onOpen}
      className={`grid min-h-10 grid-cols-[48px_2px_1fr] items-center gap-3 rounded-lg text-left text-base hover:text-ink ${past ? 'opacity-45' : ''}`}
    >
      <span className="mono text-right text-sm text-ink-3">{item.allDay ? t.home.allDay : fmtTime(item.start!)}</span>
      <span className="h-[22px] rounded-full" style={{ background: SPACE_COLOR[item.space] }} />
      <span className="min-w-0">
        <span className="block truncate">{item.title}</span>
        {!item.allDay && (
          <span className="block text-xs text-ink-3">
            {fmtTime(item.start!)}–{fmtTime(item.end ?? item.start!)}
            {project ? ` · ${project.name}` : ''}
          </span>
        )}
      </span>
    </button>
  )
}
