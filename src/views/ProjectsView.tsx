import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronRight, Flame, FolderPlus, GanttChartSquare, Hourglass, List, Plus } from 'lucide-react'
import { Page } from '@/components/Page'
import { Loom, type LoomLane } from '@/components/Loom'
import { SpaceFilterSwitch } from '@/components/todo'
import { Button, EmptyState, ProjectGlyph, Segmented, SpaceThread, cn } from '@/components/ui'
import { Modal } from '@/components/overlays'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { addDays, daysUntil, fmtCountdown, fmtRelDay, fmtShort, startOfDay } from '@/lib/date'
import { currentPhase, isOverdue, projectNextStep, projectSignals, projectStats } from '@/lib/selectors'
import { DEFAULT_SPACE, PROJECT_COLORS, SPACE_COLOR, SPACES } from '@/lib/types'
import type { Project, Space } from '@/lib/types'

const COLS = 'md:grid-cols-[minmax(0,1fr)_180px_128px_160px_72px]'

const byDue = (a: Project, b: Project) =>
  (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.name.localeCompare(b.name)

export function ProjectsView() {
  const t = useT()
  const navigate = useNavigate()
  const data = useStore((s) => s.data)
  const filter = data.settings.spaceFilter
  const [params, setParams] = useSearchParams()
  const view = params.get('view') === 'loom' ? 'loom' : 'list'
  const setView = (v: 'list' | 'loom') => setParams(v === 'list' ? {} : { view: v }, { replace: true })
  const [dialog, setDialog] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ paused: true, done: true })

  const all = useMemo(
    () => Object.values(data.projects).filter((p) => filter === 'all' || p.space === filter),
    [data.projects, filter],
  )
  const active = all.filter((p) => p.status === 'active').sort(byDue)
  const paused = all.filter((p) => p.status === 'paused').sort(byDue)
  const done = all.filter((p) => p.status === 'done').sort(byDue)
  const counts = Object.values(data.projects).reduce(
    (c, p) => ({ ...c, [p.status]: c[p.status] + 1 }),
    { active: 0, paused: 0, done: 0 },
  )

  const actions = (
    <>
      <SpaceFilterSwitch />
      <Segmented
        options={[
          { value: 'list', label: <><List size={15} />{t.project.viewList}</> },
          { value: 'loom', label: <><GanttChartSquare size={15} />{t.project.viewLoom}</> },
        ]}
        value={view}
        onChange={setView}
      />
      <Button variant="accent" onClick={() => setDialog(true)}>
        <Plus size={15} />
        {t.project.newProject}
      </Button>
    </>
  )

  const group = (key: string, title: React.ReactNode, list: Project[], collapsible = false) => {
    if (!list.length) return null
    const open = !collapsible || !collapsed[key]
    return (
      <section key={key} className="mb-9">
        <div className="flex items-center gap-2.5 px-3.5 pb-2.5 text-sm font-semibold text-ink-2">
          {collapsible ? (
            <button
              onClick={() => setCollapsed((c) => ({ ...c, [key]: !c[key] }))}
              className="flex items-center gap-2.5 hover:text-ink"
              aria-expanded={open}
            >
              <ChevronRight size={14} className={cn('transition-transform', open && 'rotate-90')} />
              {title}
              <span className="font-medium text-ink-3">{list.length}</span>
            </button>
          ) : (
            <>
              {title}
              <span className="font-medium text-ink-3">{list.length}</span>
            </>
          )}
        </div>
        {open && (
          <div className="border-t border-line">
            {list.map((p) => (
              <ProjectRow key={p.id} project={p} onOpen={() => navigate(`/project/${p.id}`)} />
            ))}
          </div>
        )}
      </section>
    )
  }

  return (
    <Page eyebrow={t.project.counts(counts.active, counts.paused, counts.done)} title={t.project.overviewTitle} actions={actions}>
      {all.length === 0 ? (
        <EmptyState
          icon={<FolderPlus size={20} />}
          title={t.project.noProjectsTitle}
          hint={t.project.noProjectsHint}
          action={
            <Button variant="accent" onClick={() => setDialog(true)}>
              <Plus size={15} />
              {t.project.newProject}
            </Button>
          }
        />
      ) : view === 'loom' ? (
        <PortfolioLoom projects={active} />
      ) : (
        <>
          <div className={cn('hidden gap-x-5 px-3.5 pb-3.5 text-xs text-ink-3 md:grid', COLS)}>
            <span>{t.project.colProject}</span>
            <span>{t.project.colPhase}</span>
            <span>{t.project.colDue}</span>
            <span>{t.project.colProgress}</span>
            <span className="text-right">{t.project.colSignals}</span>
          </div>
          {(filter === 'all' ? SPACES : [filter]).map((sp) =>
            group(
              sp,
              <>
                <SpaceThread color={SPACE_COLOR[sp]} className="w-[18px]" />
                {t.spaces[sp]}
              </>,
              active.filter((p) => p.space === sp),
            ),
          )}
          {group('paused', t.project.groupPaused, paused, true)}
          {group('done', t.project.groupDone, done, true)}
        </>
      )}
      <NewProjectDialog open={dialog} onClose={() => setDialog(false)} />
    </Page>
  )
}

function ProjectRow({ project: p, onOpen }: { project: Project; onOpen: () => void }) {
  const t = useT()
  const data = useStore((s) => s.data)
  const stats = projectStats(data, p.id)
  const next = projectNextStep(data, p.id)
  const sig = projectSignals(data, p.id)
  const phase = currentPhase(data, p)
  const n = p.due ? daysUntil(p.due) : null
  const late = n != null && n < 0 && p.status !== 'done'

  return (
    <div
      onClick={onOpen}
      className={cn(
        'grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 gap-y-2.5 border-b border-line px-2 py-3.5 transition-colors hover:bg-surface md:px-3.5',
        COLS,
      )}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2.5">
          <ProjectGlyph color={p.color} className="h-[11px] w-[11px] rounded-[3.5px]" />
          <span className={cn('truncate text-[15px] font-semibold', p.status === 'done' && 'text-ink-2')}>{p.name}</span>
        </div>
        <div className="ml-[21px] mt-1 flex min-w-0 items-center gap-1.5 text-sm text-ink-2">
          {next ? (
            <>
              {(next.flame || isOverdue(next)) && <Flame size={13} className="shrink-0 text-flame" />}
              <span className="shrink-0 text-ink-3">{t.project.nextLabel}</span>
              <span className="truncate">{next.title}</span>
              {next.due && <span className="shrink-0 text-ink-3">· {fmtRelDay(next.due)}</span>}
            </>
          ) : (
            <span className="text-ink-3">{p.status === 'done' ? t.project.closed : t.project.noOpen}</span>
          )}
        </div>
      </div>

      <div className="max-md:hidden">
        {p.status !== 'active' ? (
          <StatusPill status={p.status} />
        ) : phase ? (
          <span className="inline-flex h-6 max-w-full items-center gap-2 truncate rounded-full bg-surface-2 px-2.5 text-sm font-medium text-ink">
            <i className="h-1.5 w-1.5 shrink-0 rounded-full bg-iris" />
            <span className="truncate">{phase.name}</span>
          </span>
        ) : (
          <span className="text-sm text-ink-4">{t.project.noPhases}</span>
        )}
      </div>

      <div className="text-right md:text-left">
        {p.due ? (
          <>
            <div className="text-base font-medium">{fmtShort(p.due)}</div>
            <div
              className={cn(
                'text-sm',
                p.status === 'done' ? 'text-ink-3' : late ? 'text-rose' : n! <= 7 ? 'text-amber' : 'text-ink-3',
              )}
            >
              {late ? t.project.overdueBy(-n!) : fmtCountdown(p.due)}
            </div>
          </>
        ) : (
          <>
            <div className="text-base text-ink-3">—</div>
            <div className="text-sm text-ink-4">{t.project.dueNone}</div>
          </>
        )}
      </div>

      <div className="col-span-2 flex items-center gap-2.5 md:col-span-1">
        <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
          <i className="block h-full rounded-full" style={{ width: `${stats.pct}%`, background: p.color }} />
        </span>
        <span className="mono min-w-9 text-right text-sm text-ink-2">
          {stats.done}/{stats.total}
        </span>
      </div>

      <div className="flex justify-end gap-2.5 text-sm text-ink-2 max-md:hidden">
        {sig.hot > 0 && (
          <span className="flex items-center gap-1 text-flame" title={t.todo.hot}>
            <Flame size={13} />
            {sig.hot}
          </span>
        )}
        {sig.waiting > 0 && (
          <span className="flex items-center gap-1" title={t.todo.waiting}>
            <Hourglass size={13} className="text-amber" />
            {sig.waiting}
          </span>
        )}
        {!sig.hot && !sig.waiting && <span className="text-ink-4">—</span>}
      </div>
    </div>
  )
}

export function StatusPill({ status }: { status: Project['status'] }) {
  const t = useT()
  const label = status === 'active' ? t.project.statusActive : status === 'paused' ? t.project.statusPaused : t.project.statusDone
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-2 rounded-full bg-surface-2 px-2.5 text-sm font-medium',
        status === 'active' ? 'text-ink' : 'text-ink-3',
      )}
    >
      <i className={cn('h-1.5 w-1.5 rounded-full', status === 'active' ? 'bg-iris' : 'bg-ink-3')} />
      {label}
    </span>
  )
}

/** every active project with a due date as one thread across the weeks */
function PortfolioLoom({ projects }: { projects: Project[] }) {
  const t = useT()
  const navigate = useNavigate()
  const data = useStore((s) => s.data)
  const dated = projects.filter((p) => p.due)
  if (!dated.length) return <p className="px-1 text-base text-ink-3">{t.project.loomEmpty}</p>

  const today = startOfDay(new Date())
  const lanes: LoomLane[] = dated.map((p) => {
    const st = projectStats(data, p.id)
    const start = startOfDay(p.start ?? p.createdAt ?? today)
    return {
      key: p.id,
      label: (
        <>
          <ProjectGlyph color={p.color} />
          <span className="truncate">{p.name}</span>
        </>
      ),
      meta: `${st.done}/${st.total}`,
      color: p.color,
      start: start > startOfDay(p.due!) ? startOfDay(p.due!) : start,
      end: startOfDay(p.due!),
      progress: st.total ? st.done / st.total : 0,
      onClick: () => navigate(`/project/${p.id}`),
      flag: true,
    }
  })
  const from = addDays(today, -21)
  const last = lanes.reduce((m, l) => (l.end > m ? l.end : m), addDays(today, 28))
  return (
    <>
      <Loom lanes={lanes} from={from} to={addDays(last, 4)} />
      <p className="mt-3.5 max-w-[70ch] px-1 text-sm text-ink-3">{t.project.loomHint}</p>
    </>
  )
}

function NewProjectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const navigate = useNavigate()
  const addProject = useStore((s) => s.addProject)
  const projectCount = useStore((s) => Object.keys(s.data.projects).length)
  const [name, setName] = useState('')
  const [space, setSpace] = useState<Space>(DEFAULT_SPACE)
  const [color, setColor] = useState<string | null>(null)
  const [due, setDue] = useState('')
  const [template, setTemplate] = useState('none')
  const autoColor = PROJECT_COLORS[projectCount % PROJECT_COLORS.length].value

  function create() {
    const n = name.trim()
    if (!n) return
    const names = template === 'none' ? [] : t.project.templates[Number(template)]
    const p = addProject(n, color ?? autoColor, space, {
      due: due ? new Date(due + 'T00:00').toISOString() : undefined,
      phases: names.length ? names.map((nm, i) => ({ id: `${Date.now().toString(36)}${i}`, name: nm })) : undefined,
    })
    setName('')
    setDue('')
    setTemplate('none')
    setColor(null)
    onClose()
    navigate(`/project/${p.id}`)
  }

  return (
    <Modal open={open} onClose={onClose} title={t.project.newProject} width={460}>
      <div className="flex flex-col gap-5 p-5">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && create()}
          placeholder={t.project.newProjectName}
          className="display w-full bg-transparent text-2xl text-ink outline-none placeholder:text-ink-4"
        />
        <div className="flex flex-wrap items-center gap-3">
          {SPACES.length > 1 && (
          <Segmented
            size="md"
            options={SPACES.map((sp) => ({
              value: sp,
              label: (
                <>
                  <SpaceThread color={SPACE_COLOR[sp]} />
                  {t.spaces[sp]}
                </>
              ),
            }))}
            value={space}
            onChange={setSpace}
          />
          )}
          <div className="flex gap-1.5">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c.name}
                onClick={() => setColor(c.value)}
                className={cn(
                  'h-5 w-5 rounded-[6px] ring-offset-2 ring-offset-surface transition-shadow',
                  (color ?? autoColor) === c.value && 'ring-2 ring-ink-2',
                )}
                style={{ background: c.value }}
                aria-label={t.project.colors[c.name]}
              />
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 text-sm text-ink-3">{t.project.template}</div>
          <Segmented
            options={[
              { value: 'none', label: t.project.templateNone },
              ...t.project.templates.map((names, i) => ({ value: String(i), label: names.join(' → ') })),
            ]}
            value={template}
            onChange={setTemplate}
            className="max-w-full flex-wrap"
          />
        </div>
        <label className="flex items-center gap-3 text-sm text-ink-3">
          {t.project.dueOptional}
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="h-9 rounded-md border border-line-2 bg-surface px-3 text-sm text-ink outline-none [color-scheme:dark] focus:border-iris/60"
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button variant="accent" onClick={create} disabled={!name.trim()}>
            {t.project.create}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
