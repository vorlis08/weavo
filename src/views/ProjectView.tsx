import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowDown,
  ArrowUp,
  CalendarRange,
  Check,
  ChevronRight,
  Columns3,
  FileText,
  Flame,
  GanttChartSquare,
  Hourglass,
  ListChecks,
  MoreHorizontal,
  Pencil,
  Plus,
  Target,
  Trash2,
  X,
} from 'lucide-react'
import { Card, Page } from '@/components/Page'
import { Loom, type LoomLane } from '@/components/Loom'
import { DueLabel, TodoList, byUrgency } from '@/components/todo'
import { Button, EmptyState, ProjectGlyph, SpaceThread, cn } from '@/components/ui'
import { ConfirmDialog, Menu } from '@/components/overlays'
import { InlineBody } from '@/components/editors'
import { BoardColumns } from './Board'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { addDays, daysUntil, fmtCountdown, fmtRelDay, fmtShort, fmtTime, startOfDay, toLocalInput } from '@/lib/date'
import { currentPhase, phaseStats, projectNextStep, projectStats } from '@/lib/selectors'
import { taskFromLine } from '@/lib/capture'
import { PROJECT_COLORS, PROJECT_STATUSES, SPACE_COLOR, SPACES } from '@/lib/types'
import type { Item, Project, ProjectPhase, ProjectStatus } from '@/lib/types'

type Tab = 'tasks' | 'kanban' | 'loom'

const isoDay = (v: string) => (v ? new Date(v + 'T00:00').toISOString() : undefined)
const dayValue = (iso?: string) => (iso ? toLocalInput(iso).slice(0, 10) : '')

export function ProjectView() {
  const t = useT()
  const { id } = useParams()
  const navigate = useNavigate()
  const project = useStore((s) => (id ? s.data.projects[id] : undefined))
  const updateProject = useStore((s) => s.updateProject)
  const deleteProject = useStore((s) => s.deleteProject)
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'kanban' ? 'kanban' : params.get('tab') === 'loom' ? 'loom' : 'tasks'
  const setTab = (t: Tab) => setParams(t === 'tasks' ? {} : { tab: t }, { replace: true })
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!project) {
    return (
      <Page title={t.project.notFoundTitle}>
        <EmptyState title={t.project.notFoundTitle} hint={t.project.notFoundBody} />
      </Page>
    )
  }

  const actions = (
    <Menu
      align="right"
      trigger={({ toggle }) => (
        <Button variant="ghost" square onClick={toggle} aria-label={t.project.properties}>
          <MoreHorizontal size={17} />
        </Button>
      )}
      items={[
        {
          label: t.project.deleteProject,
          icon: <Trash2 size={14} />,
          danger: true,
          onSelect: () => setConfirmDelete(true),
        },
      ]}
    />
  )

  const crumb = (
    <div className="mb-3.5 flex items-center gap-2 text-sm text-ink-3">
      <Link to="/projects" className="hover:text-ink">
        {t.project.overviewTitle}
      </Link>
      <ChevronRight size={13} />
      <span className="flex items-center gap-2">
        <SpaceThread color={SPACE_COLOR[project.space]} />
        {t.spaces[project.space]}
      </span>
      <span className="-my-2 ml-auto">{actions}</span>
    </div>
  )

  return (
    <Page
      before={crumb}
      title={<ProjectTitle project={project} />}
      lede={
        <InlineBody
          value={project.description ?? ''}
          onCommit={(v) => updateProject(project.id, { description: v || undefined })}
          placeholder={t.project.briefPh}
        />
      }
    >
      <PropChips project={project} />

      <div className="mb-7 mt-8 flex gap-1 border-b border-line">
        {(
          [
            ['tasks', t.project.tabTasks, ListChecks],
            ['kanban', t.project.tabKanban, Columns3],
            ['loom', t.project.tabLoom, GanttChartSquare],
          ] as [Tab, string, typeof ListChecks][]
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'relative flex h-10 items-center gap-2 px-3 text-base font-medium transition-colors',
              tab === key ? 'text-ink' : 'text-ink-3 hover:text-ink',
            )}
          >
            <Icon size={15} />
            {label}
            {tab === key && <span className="absolute inset-x-2.5 -bottom-px h-[2px] rounded-full bg-iris" />}
          </button>
        ))}
      </div>

      {tab === 'tasks' && <TasksTab project={project} />}
      {tab === 'kanban' && (
        <div className="-mx-4 flex min-h-[420px] md:-mx-5">
          <BoardColumns projectId={project.id} />
        </div>
      )}
      {tab === 'loom' && <LoomTab project={project} />}

      <ConfirmDialog
        open={confirmDelete}
        title={t.project.deleteConfirmTitle(project.name)}
        body={t.project.deleteConfirmBody}
        onConfirm={() => {
          deleteProject(project.id)
          navigate('/projects')
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </Page>
  )
}

/** the colored square (click to recolor) and the name (click to rename) */
function ProjectTitle({ project }: { project: Project }) {
  const t = useT()
  const updateProject = useStore((s) => s.updateProject)
  const [draft, setDraft] = useState(project.name)
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => setDraft(project.name), [project.name])
  useEffect(() => {
    const el = ref.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    }
  }, [draft])
  return (
    <span className="flex items-start gap-3.5">
      <Menu
        trigger={({ toggle }) => (
          <button
            onClick={toggle}
            className="mt-[0.27em] flex h-5 w-5 shrink-0 items-center justify-center rounded-md hover:bg-surface-2"
            aria-label={t.project.colors[PROJECT_COLORS.find((c) => c.value === project.color)?.name ?? 'slate']}
          >
            <ProjectGlyph color={project.color} className="h-4 w-4 rounded-[5px]" />
          </button>
        )}
        items={PROJECT_COLORS.map((c) => ({
          label: t.project.colors[c.name],
          icon: <ProjectGlyph color={c.value} className="h-3 w-3" />,
          onSelect: () => updateProject(project.id, { color: c.value }),
        }))}
      />
      <textarea
        ref={ref}
        value={draft}
        rows={1}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const v = draft.trim()
          if (v && v !== project.name) updateProject(project.id, { name: v })
          else setDraft(project.name)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            ;(e.target as HTMLTextAreaElement).blur()
          }
        }}
        aria-label={t.project.rename}
        className="w-full resize-none overflow-hidden bg-transparent leading-[1.1] outline-none"
      />
    </span>
  )
}

function Chip({ children, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={cn(
        'relative inline-flex h-8 items-center gap-2 rounded-md border border-line bg-surface px-3 text-sm text-ink-2 transition-colors hover:border-line-3 hover:text-ink',
        className,
      )}
    >
      {children}
    </button>
  )
}

/** properties as chips — an empty one reads "+ Due" instead of an empty field */
function PropChips({ project }: { project: Project }) {
  const t = useT()
  const data = useStore((s) => s.data)
  const updateProject = useStore((s) => s.updateProject)
  const stats = projectStats(data, project.id)
  const goals = Object.values(data.goals).filter((g) => !g.archived || g.id === project.goalId)
  const goal = project.goalId ? data.goals[project.goalId] : undefined
  const statusLabel: Record<ProjectStatus, string> = {
    active: t.project.statusActive,
    paused: t.project.statusPaused,
    done: t.project.statusDone,
  }
  const n = project.due ? daysUntil(project.due) : null

  return (
    <div className="-mt-2 flex flex-wrap gap-2">
      <Menu
        trigger={({ toggle }) => (
          <Chip onClick={toggle}>
            <SpaceThread color={SPACE_COLOR[project.space]} className="w-3.5" />
            <b className="font-medium text-ink">{t.spaces[project.space]}</b>
          </Chip>
        )}
        items={SPACES.map((sp) => ({
          label: t.spaces[sp],
          icon: <SpaceThread color={SPACE_COLOR[sp]} />,
          onSelect: () => updateProject(project.id, { space: sp }),
        }))}
      />
      <Menu
        trigger={({ toggle }) => (
          <Chip onClick={toggle}>
            <i className={cn('h-1.5 w-1.5 rounded-full', project.status === 'active' ? 'bg-iris' : 'bg-ink-3')} />
            <b className="font-medium text-ink">{statusLabel[project.status]}</b>
          </Chip>
        )}
        items={PROJECT_STATUSES.map((st) => ({
          label: statusLabel[st],
          icon: project.status === st ? <Check size={14} /> : <span className="w-3.5" />,
          onSelect: () => updateProject(project.id, { status: st }),
        }))}
      />
      <DateChip
        label={t.project.chipDue}
        value={project.due}
        onChange={(v) => updateProject(project.id, { due: v })}
        tone={n == null || project.status === 'done' ? undefined : n < 0 ? 'late' : n <= 7 ? 'soon' : undefined}
        suffix={project.due ? fmtCountdown(project.due) : undefined}
      />
      <span className="relative inline-flex">
        <Chip tabIndex={-1} className={cn(!goal && 'border-dashed bg-transparent text-ink-3')}>
          {goal ? <Target size={14} /> : <Plus size={14} />}
          {goal ? <b className="font-medium text-ink">{goal.title}</b> : <span>{t.project.propGoal}</span>}
        </Chip>
        <select
          value={project.goalId ?? ''}
          onChange={(e) => updateProject(project.id, { goalId: e.target.value || undefined })}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label={t.project.propGoal}
        >
          <option value="">{t.project.noGoal}</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
      </span>
      <Chip tabIndex={-1} className="pointer-events-none">
        <span className="h-1 w-12 overflow-hidden rounded-full bg-surface-3">
          <i className="block h-full rounded-full" style={{ width: `${stats.pct}%`, background: project.color }} />
        </span>
        <b className="font-medium text-ink">{t.project.doneOf(stats.done, stats.total)}</b>
      </Chip>
    </div>
  )
}

/** a date property as a chip; clicking opens the native date picker */
function DateChip({
  label,
  value,
  onChange,
  suffix,
  tone,
}: {
  label: string
  value?: string
  onChange: (iso: string | undefined) => void
  suffix?: string
  tone?: 'late' | 'soon'
}) {
  const t = useT()
  const input = useRef<HTMLInputElement>(null)
  return (
    <span className="relative inline-flex">
      <Chip
        onClick={() => input.current?.showPicker?.()}
        className={cn(!value && 'border-dashed bg-transparent text-ink-3')}
      >
        {value ? (
          <>
            <span className="text-ink-3">{label}</span>
            <b className="font-medium text-ink">{fmtShort(value)}</b>
            {suffix && (
              <span className={cn(tone === 'late' ? 'text-rose' : tone === 'soon' ? 'text-amber' : 'text-ink-3')}>
                · {suffix}
              </span>
            )}
          </>
        ) : (
          <>
            <Plus size={14} />
            {label}
          </>
        )}
      </Chip>
      {value && (
        <button
          onClick={() => onChange(undefined)}
          className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full border border-line-2 bg-surface-3 text-ink-3 hover:text-ink [span:hover>&]:flex"
          aria-label={t.project.clear}
        >
          <X size={11} />
        </button>
      )}
      <input
        ref={input}
        type="date"
        value={dayValue(value)}
        onChange={(e) => onChange(isoDay(e.target.value))}
        tabIndex={-1}
        className="pointer-events-none absolute inset-0 opacity-0"
        aria-label={label}
      />
    </span>
  )
}

function TasksTab({ project }: { project: Project }) {
  const t = useT()
  const data = useStore((s) => s.data)
  const addPhase = useStore((s) => s.addPhase)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const phases = project.phases ?? []
  const loose = Object.values(data.items).filter(
    (it) => it.projectId === project.id && it.kind === 'task' && !it.parentId && !it.someday && !it.phaseId,
  )

  function commitPhase() {
    const v = draft.trim()
    if (v) addPhase(project.id, v)
    setDraft('')
    setAdding(false)
  }

  return (
    <div className="grid items-start gap-9 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        {phases.map((ph, i) => (
          <PhaseBlock key={ph.id} project={project} phase={ph} index={i} count={phases.length} />
        ))}
        {(phases.length === 0 || loose.length > 0) && (
          <PhaseBlock project={project} phase={null} index={phases.length} count={phases.length} />
        )}
        {adding ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitPhase}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitPhase()
              if (e.key === 'Escape') {
                setDraft('')
                setAdding(false)
              }
            }}
            placeholder={t.project.phaseNamePh}
            className="display h-11 w-full rounded-md border border-line-2 bg-surface px-3.5 text-lg text-ink outline-none placeholder:text-ink-4 focus:border-iris/60"
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex h-11 w-full items-center gap-2.5 rounded-md border border-dashed border-line-2 px-3.5 text-base text-ink-3 transition-colors hover:border-line-3 hover:text-ink-2"
          >
            <Plus size={16} />
            {t.project.addPhase}
          </button>
        )}
      </div>
      <Rail project={project} />
    </div>
  )
}

/** one phase: header with progress and a menu, open tasks, collapsed done, inline add */
function PhaseBlock({
  project,
  phase,
  index,
  count,
}: {
  project: Project
  phase: ProjectPhase | null
  index: number
  count: number
}) {
  const t = useT()
  const data = useStore((s) => s.data)
  const { updatePhase, deletePhase, movePhase } = useStore()
  const stats = phaseStats(data, project.id, phase?.id ?? null)
  const complete = stats.total > 0 && stats.done === stats.total
  const [open, setOpen] = useState(!complete)
  const [showDone, setShowDone] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [dates, setDates] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const current = phase && currentPhase(data, project)?.id === phase.id

  const tasks = Object.values(data.items).filter(
    (it) =>
      it.projectId === project.id &&
      it.kind === 'task' &&
      !it.parentId &&
      !it.someday &&
      (phase ? it.phaseId === phase.id : !it.phaseId),
  )
  const openTasks = tasks
    .filter((it) => it.status !== 'done')
    .sort((a, b) => Number(!!a.waitingFor) - Number(!!b.waitingFor) || byUrgency(a, b))
  const doneTasks = tasks.filter((it) => it.status === 'done')
  const title = phase ? phase.name : count ? t.project.phaseNone : t.project.tasksTitle

  return (
    <section className="mb-8">
      <div className="group/ph flex flex-wrap items-center gap-x-3 gap-y-1 px-3 pb-2">
        {renaming && phase ? (
          <input
            autoFocus
            defaultValue={phase.name}
            onBlur={(e) => {
              const v = e.target.value.trim()
              if (v) updatePhase(project.id, phase.id, { name: v })
              setRenaming(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') setRenaming(false)
            }}
            className="display h-8 rounded-lg border border-line-2 bg-surface px-2 text-lg outline-none focus:border-iris/60"
          />
        ) : (
          <button
            onClick={() => setOpen((v) => !v)}
            className={cn('display flex items-center gap-2.5 text-lg', complete ? 'text-ink-3' : 'text-ink')}
            aria-expanded={open}
          >
            <ChevronRight size={16} className={cn('text-ink-3 transition-transform', open && 'rotate-90')} />
            {title}
            {complete && <Check size={16} className="text-sage" />}
          </button>
        )}
        {phase && (phase.start || phase.end) && (
          <span className={cn('text-sm', current ? 'text-iris-2' : 'text-ink-3')}>
            {current && `${t.project.phaseRunning} · `}
            {phase.start ? fmtShort(phase.start) : '…'} – {phase.end ? fmtShort(phase.end) : '…'}
          </span>
        )}
        {phase && !phase.start && !phase.end && current && (
          <span className="text-sm text-iris-2">{t.project.phaseRunning}</span>
        )}
        <span className="ml-auto flex items-center gap-2 text-sm text-ink-3">
          <span className="h-[3px] w-14 overflow-hidden rounded-full bg-surface-3">
            <i
              className="block h-full rounded-full"
              style={{ width: `${stats.total ? (stats.done / stats.total) * 100 : 0}%`, background: project.color }}
            />
          </span>
          <span className="mono">
            {stats.done}/{stats.total}
          </span>
          {phase && (
            <Menu
              align="right"
              trigger={({ toggle }) => (
                <button
                  onClick={toggle}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-3 opacity-60 transition hover:bg-surface-2 hover:text-ink group-hover/ph:opacity-100"
                  aria-label={t.project.phaseRename}
                >
                  <MoreHorizontal size={15} />
                </button>
              )}
              items={[
                { label: t.project.phaseRename, icon: <Pencil size={14} />, onSelect: () => setRenaming(true) },
                { label: t.project.phaseDates, icon: <CalendarRange size={14} />, onSelect: () => setDates((v) => !v) },
                ...(index > 0
                  ? [{ label: t.project.phaseUp, icon: <ArrowUp size={14} />, onSelect: () => movePhase(project.id, phase.id, -1) }]
                  : []),
                ...(index < count - 1
                  ? [{ label: t.project.phaseDown, icon: <ArrowDown size={14} />, onSelect: () => movePhase(project.id, phase.id, 1) }]
                  : []),
                'separator' as const,
                { label: t.project.phaseDelete, icon: <Trash2 size={14} />, danger: true, onSelect: () => setConfirm(true) },
              ]}
            />
          )}
        </span>
      </div>

      {dates && phase && (
        <div className="mb-2 flex flex-wrap items-center gap-3 px-3 text-sm text-ink-3">
          {(['start', 'end'] as const).map((k) => (
            <label key={k} className="flex items-center gap-2">
              {k === 'start' ? t.project.phaseFrom : t.project.phaseTo}
              <input
                type="date"
                value={dayValue(phase[k])}
                onChange={(e) => updatePhase(project.id, phase.id, { [k]: isoDay(e.target.value) })}
                className="h-8 rounded-lg border border-line-2 bg-surface px-2 text-sm text-ink outline-none [color-scheme:dark] focus:border-iris/60"
              />
            </label>
          ))}
          <button onClick={() => setDates(false)} className="text-ink-3 hover:text-ink">
            <X size={15} />
          </button>
        </div>
      )}

      {open && (
        <>
          <TodoList items={openTasks} hideProject empty={tasks.length ? undefined : t.project.emptyTasks} />
          {doneTasks.length > 0 && (
            <>
              <button
                onClick={() => setShowDone((v) => !v)}
                className="ml-11 mt-1 flex items-center gap-1.5 py-1 text-sm text-ink-3 hover:text-ink-2"
              >
                <ChevronRight size={13} className={cn('transition-transform', showDone && 'rotate-90')} />
                {t.project.doneCount(doneTasks.length)}
              </button>
              {showDone && <TodoList items={doneTasks} hideProject />}
            </>
          )}
          <InlineTaskAdd project={project} phaseId={phase?.id} />
        </>
      )}

      {phase && (
        <ConfirmDialog
          open={confirm}
          title={t.project.phaseDeleteTitle(phase.name)}
          body={t.project.phaseDeleteBody}
          onConfirm={() => {
            deletePhase(project.id, phase.id)
            setConfirm(false)
          }}
          onCancel={() => setConfirm(false)}
        />
      )}
    </section>
  )
}

function InlineTaskAdd({ project, phaseId }: { project: Project; phaseId?: string }) {
  const t = useT()
  const data = useStore((s) => s.data)
  const createItem = useStore((s) => s.createItem)
  const [draft, setDraft] = useState('')
  function commit() {
    const partial = taskFromLine(draft, project.space, data, { projectId: project.id, phaseId })
    if (partial) createItem(partial)
    setDraft('')
  }
  return (
    <label className="flex min-h-11 items-center gap-3 rounded-md px-3 text-ink-3 transition-colors hover:bg-surface focus-within:bg-surface">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.6px] border-dashed border-ink-4">
        <Plus size={11} strokeWidth={2.4} />
      </span>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        onBlur={() => draft.trim() && commit()}
        placeholder={t.project.addTaskPh}
        className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-3"
      />
    </label>
  )
}

/** the right rail: next step, what's coming, who we wait on, notes */
function Rail({ project }: { project: Project }) {
  const t = useT()
  const navigate = useNavigate()
  const data = useStore((s) => s.data)
  const toggleDone = useStore((s) => s.toggleDone)
  const createItem = useStore((s) => s.createItem)
  const openPeek = useStore((s) => s.openPeek)
  const next = projectNextStep(data, project.id)
  const mine = useMemo(() => Object.values(data.items).filter((it) => it.projectId === project.id), [data.items, project.id])
  const today = startOfDay(new Date())
  const events = mine
    .filter((it) => it.kind === 'event' && it.start && new Date(it.start) >= today)
    .sort((a, b) => (a.start! < b.start! ? -1 : 1))
    .slice(0, 5)
  const waiting = mine.filter((it) => it.kind === 'task' && it.status !== 'done' && it.waitingFor)
  const notes = mine.filter((it) => it.kind === 'note').sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))

  return (
    <div className="flex flex-col gap-3.5">
      {next && (
        <section
          className="rounded-lg border border-line bg-surface p-3.5"
        >
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink-3">
            {next.flame && <Flame size={13} className="text-flame" />}
            {t.project.nextStep}
          </div>
          <button onClick={() => openPeek(next.id)} className="display text-left text-lg leading-snug hover:text-ink">
            {next.title}
          </button>
          <div className="mt-1.5 text-sm text-ink-3">
            <DueLabel item={next} data={data} />
          </div>
          <Button className="mt-3.5 w-full" onClick={() => toggleDone(next.id)}>
            <Check size={15} />
            {t.project.markDone}
          </Button>
        </section>
      )}

      {events.length > 0 && (
        <Card title={t.project.upcomingTitle}>
          <RailList>
            {events.map((ev) => (
              <RailRow key={ev.id} onClick={() => navigate(`/item/${ev.id}`)}>
                <span className="h-4 w-[2px] shrink-0 rounded-full" style={{ background: SPACE_COLOR[ev.space] }} />
                <span className="min-w-0 flex-1 truncate">{ev.title}</span>
                <span className="shrink-0 text-sm text-ink-3">
                  {fmtRelDay(ev.start!)} {!ev.allDay && fmtTime(ev.start!)}
                </span>
              </RailRow>
            ))}
          </RailList>
        </Card>
      )}

      {waiting.length > 0 && (
        <Card title={<><Hourglass size={14} className="text-amber" />{t.project.waitingTitle}</>}>
          <RailList>
            {waiting.map((it) => (
              <RailRow key={it.id} onClick={() => openPeek(it.id)}>
                <span className="min-w-0 flex-1 truncate">{it.title}</span>
                <span className="shrink-0 text-sm text-ink-3">{it.waitingFor!.who}</span>
              </RailRow>
            ))}
          </RailList>
        </Card>
      )}

      <Card
        title={t.project.notesTitle}
        action={
          <button
            onClick={() => {
              const n = createItem({ kind: 'note', title: t.project.newNote, projectId: project.id })
              navigate(`/item/${n.id}`)
            }}
            className="flex items-center gap-1 text-iris-2 hover:text-iris"
          >
            <Plus size={13} />
            {t.project.newNote}
          </button>
        }
      >
        {notes.length ? (
          <RailList>
            {notes.map((n: Item) => (
              <RailRow key={n.id} onClick={() => navigate(`/item/${n.id}`)}>
                <FileText size={14} className="shrink-0 text-ink-3" />
                <span className="min-w-0 flex-1 truncate">{n.title}</span>
              </RailRow>
            ))}
          </RailList>
        ) : (
          <p className="text-sm text-ink-3">{t.project.noNotes}</p>
        )}
      </Card>
    </div>
  )
}

const RailList = ({ children }: { children: ReactNode }) => <div className="flex flex-col">{children}</div>
const RailRow = ({ children, onClick }: { children: ReactNode; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex min-h-[38px] items-center gap-2.5 border-t border-line text-left text-base first:border-t-0 hover:text-ink"
  >
    {children}
  </button>
)

/** the project on the loom: the whole span, then each dated phase */
function LoomTab({ project }: { project: Project }) {
  const t = useT()
  const data = useStore((s) => s.data)
  const updateProject = useStore((s) => s.updateProject)
  const today = startOfDay(new Date())
  const stats = projectStats(data, project.id)
  const start = startOfDay(project.start ?? project.createdAt ?? today)
  const phases = project.phases ?? []
  const dated = phases.filter((ph) => ph.start && ph.end)
  const undated = phases.filter((ph) => !(ph.start && ph.end))

  const startChip = (
    <DateChip
      label={t.project.chipStart}
      value={project.start}
      onChange={(v) => updateProject(project.id, { start: v })}
    />
  )

  if (!project.due && !dated.length)
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-base text-ink-3">{t.project.loomNoDates}</p>
        {startChip}
      </div>
    )

  const end = project.due ? startOfDay(project.due) : dated.reduce((m, ph) => (startOfDay(ph.end!) > m ? startOfDay(ph.end!) : m), today)
  const lanes: LoomLane[] = [
    {
      key: 'project',
      label: (
        <>
          <ProjectGlyph color={project.color} />
          <span className="truncate font-medium">{t.project.loomProject}</span>
        </>
      ),
      meta: `${stats.done}/${stats.total}`,
      color: project.color,
      start: start > end ? end : start,
      end,
      progress: stats.total ? stats.done / stats.total : 0,
      flag: !!project.due,
    },
    ...dated.map((ph) => {
      const s = phaseStats(data, project.id, ph.id)
      return {
        key: ph.id,
        label: <span className="truncate">{ph.name}</span>,
        meta: `${s.done}/${s.total}`,
        color: project.color,
        start: startOfDay(ph.start!),
        end: startOfDay(ph.end!),
        progress: s.total ? s.done / s.total : 0,
        title: `${fmtShort(ph.start!)} – ${fmtShort(ph.end!)}`,
      }
    }),
  ]
  const from = addDays(lanes.reduce((m, l) => (l.start < m ? l.start : m), today), -5)
  const to = addDays(lanes.reduce((m, l) => (l.end > m ? l.end : m), addDays(today, 14)), 5)

  return (
    <div className="flex flex-col gap-4">
      <div>{startChip}</div>
      <Loom lanes={lanes} from={from} to={to} labelWidth={180} />
      {undated.length > 0 && (
        <p className="text-sm text-ink-3">{t.project.loomUndated(undated.map((ph) => ph.name).join(', '))}</p>
      )}
    </div>
  )
}
