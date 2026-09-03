import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Columns3,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { Button, Checkbox, EmptyState, TextField, cn } from '@/components/ui'
import { ConfirmDialog, Menu } from '@/components/overlays'
import { CompletedRow, DueChip } from '@/components/items'
import { InlineBody } from '@/components/editors'
import { Subtasks } from '@/components/Subtasks'
import { useConfirmDelete } from '@/components/useConfirmDelete'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { dateLocale, fmtTime, isSameDay, toLocalInput } from '@/lib/date'
import { projectStats, subtasks as selectSubtasks } from '@/lib/selectors'
import { DEFAULT_PROJECT_SECTIONS, PROJECT_COLORS } from '@/lib/types'
import type { Item, ProjectSection, ProjectSectionId } from '@/lib/types'

type Buckets = { tasks: Item[]; events: Item[]; notes: Item[]; done: Item[] }

export function ProjectView() {
  const t = useT()
  const { id } = useParams()
  const navigate = useNavigate()
  const data = useStore((s) => s.data)
  const project = useStore((s) => (id ? s.data.projects[id] : undefined))
  const items = useStore((s) => s.data.items)
  const updateProject = useStore((s) => s.updateProject)
  const deleteProject = useStore((s) => s.deleteProject)
  const createItem = useStore((s) => s.createItem)

  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState('')
  const { askDelete, dialog: deleteDialog } = useConfirmDelete()
  const [confirmDelProject, setConfirmDelProject] = useState(false)

  const stats = useMemo(() => (id ? projectStats(data, id) : null), [data, id])

  const buckets = useMemo<Buckets>(() => {
    const mine = Object.values(items).filter((it) => it.projectId === id && !it.parentId)
    return {
      tasks: mine
        .filter((it) => it.kind === 'task' && it.status !== 'done')
        .sort((a, b) => ((a.due ?? '9') < (b.due ?? '9') ? -1 : 1)),
      events: mine
        .filter(
          (it) =>
            it.kind === 'event' &&
            it.start &&
            new Date(it.start) >= new Date(Date.now() - 86_400_000),
        )
        .sort((a, b) => new Date(a.start!).getTime() - new Date(b.start!).getTime()),
      notes: mine.filter((it) => it.kind === 'note'),
      done: mine.filter((it) => it.kind === 'task' && it.status === 'done'),
    }
  }, [items, id])

  if (!project) {
    return (
      <>
        <TopBar>
          <h1 className="text-[16px]">{t.project.notFoundTitle}</h1>
        </TopBar>
        <EmptyState title={t.project.notFoundTitle} hint={t.project.notFoundBody} />
      </>
    )
  }

  const sections = project.sections ?? DEFAULT_PROJECT_SECTIONS
  const deadlineValue = project.due ? toLocalInput(project.due).slice(0, 10) : ''

  function setSections(next: ProjectSection[]) {
    updateProject(project!.id, { sections: next })
  }
  function toggleCollapsed(sec: ProjectSectionId) {
    setSections(sections.map((x) => (x.id === sec ? { ...x, collapsed: !x.collapsed } : x)))
  }
  function move(from: number, dir: -1 | 1) {
    const to = from + dir
    if (to < 0 || to >= sections.length) return
    const next = [...sections]
    ;[next[from], next[to]] = [next[to], next[from]]
    setSections(next)
  }

  return (
    <>
      <TopBar>
        <Button variant="ghost" square onClick={() => navigate('/projects')}>
          <ChevronLeft size={16} />
        </Button>
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: project.color }} />
        {renaming ? (
          <TextField
            autoFocus
            defaultValue={project.name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              if (name.trim()) updateProject(project.id, { name: name.trim() })
              setRenaming(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') setRenaming(false)
            }}
            className="h-7 w-[220px]"
          />
        ) : (
          <h1 className="text-[16px]">{project.name}</h1>
        )}
        {project.archived && (
          <span className="mono text-[10px] uppercase tracking-wider text-ink-3">
            {t.project.archivedTag}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            className="text-[12px]"
            onClick={() => navigate(`/board?project=${project.id}`)}
          >
            <Columns3 size={13} />
            {t.project.board}
          </Button>
          <Menu
            align="right"
            trigger={({ toggle }) => (
              <button
                onClick={toggle}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink"
              >
                <MoreHorizontal size={15} />
              </button>
            )}
            items={[
              {
                label: t.project.rename,
                icon: <Pencil size={13} />,
                onSelect: () => {
                  setName(project.name)
                  setRenaming(true)
                },
              },
              {
                label: project.archived ? t.project.unarchive : t.project.archive,
                icon: project.archived ? <ArchiveRestore size={13} /> : <Archive size={13} />,
                onSelect: () =>
                  updateProject(project.id, { archived: project.archived ? undefined : true }),
              },
              'separator',
              {
                label: t.project.deleteProject,
                icon: <Trash2 size={13} />,
                danger: true,
                onSelect: () => setConfirmDelProject(true),
              },
            ]}
          />
        </div>
      </TopBar>

      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="mx-auto max-w-[720px]">
          {/* properties */}
          <div className="flex flex-wrap items-center gap-x-7 gap-y-2.5 text-[12px] text-ink-3">
            <label className="flex items-center gap-2">
              <span>{t.project.deadline}</span>
              <input
                type="date"
                value={deadlineValue}
                onChange={(e) =>
                  updateProject(project.id, {
                    due: e.target.value
                      ? new Date(e.target.value + 'T00:00').toISOString()
                      : undefined,
                  })
                }
                className="h-7 rounded-lg border border-line bg-surface-2 px-2 text-[11.5px] text-ink outline-none [color-scheme:dark] focus:border-iris/50"
              />
              {project.due && <DueChip due={project.due} />}
            </label>

            <div className="flex gap-1.5">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c.name}
                  onClick={() => updateProject(project.id, { color: c.value })}
                  className={cn(
                    'h-4 w-4 rounded-full ring-offset-2 ring-offset-surface transition-shadow',
                    project.color === c.value && 'ring-2 ring-white/40',
                  )}
                  style={{ background: c.value }}
                  aria-label={t.project.colors[c.name]}
                />
              ))}
            </div>

            {stats && stats.total > 0 && (
              <div className="flex items-center gap-2">
                <span>{t.project.progress}</span>
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${stats.pct}%`, background: project.color }}
                  />
                </div>
                <span className="mono text-[10.5px]">{stats.pct}%</span>
                {stats.overdue > 0 && (
                  <span className="text-rose">{t.project.overdueSummary(stats.overdue)}</span>
                )}
              </div>
            )}
          </div>

          {/* page body — free-form doc */}
          <div className="mt-6 min-h-[2em] text-[14px]">
            <InlineBody
              value={project.description ?? ''}
              onCommit={(v) => updateProject(project.id, { description: v || undefined })}
              placeholder={t.project.pageBodyPlaceholder}
              onFollow={(title) => {
                const target = Object.values(items).find(
                  (x) => x.title.toLowerCase() === title.toLowerCase(),
                )
                if (target) navigate(`/item/${target.id}`)
                else {
                  const n = createItem({ kind: 'note', title, projectId: project.id })
                  navigate(`/item/${n.id}`)
                }
              }}
            />
          </div>

          {/* content sections */}
          <div className="mt-9 flex flex-col gap-6">
            {sections.map((sec, i) => (
              <Section
                key={sec.id}
                sec={sec}
                index={i}
                total={sections.length}
                buckets={buckets}
                onToggle={() => toggleCollapsed(sec.id)}
                onMove={(dir) => move(i, dir)}
                onAddTask={(title) =>
                  createItem({ kind: 'task', title, status: 'todo', projectId: project.id })
                }
                onAddNote={(title) => createItem({ kind: 'note', title, projectId: project.id })}
                askDelete={askDelete}
              />
            ))}
          </div>
        </div>
      </div>

      {deleteDialog}
      <ConfirmDialog
        open={confirmDelProject}
        title={t.project.deleteConfirmTitle(project.name)}
        body={t.project.deleteConfirmBody}
        onConfirm={() => {
          deleteProject(project.id)
          navigate('/projects')
        }}
        onCancel={() => setConfirmDelProject(false)}
      />
    </>
  )
}

function sectionLabel(t: ReturnType<typeof useT>, id: ProjectSectionId): string {
  if (id === 'tasks') return t.project.openTasks
  if (id === 'events') return t.project.upcomingEvents
  if (id === 'notes') return t.project.notes
  return t.project.done
}

function Section({
  sec,
  index,
  total,
  buckets,
  onToggle,
  onMove,
  onAddTask,
  onAddNote,
  askDelete,
}: {
  sec: ProjectSection
  index: number
  total: number
  buckets: Buckets
  onToggle: () => void
  onMove: (dir: -1 | 1) => void
  onAddTask: (title: string) => void
  onAddNote: (title: string) => void
  askDelete: (id: string, title: string) => void
}) {
  const t = useT()
  const list =
    sec.id === 'tasks'
      ? buckets.tasks
      : sec.id === 'events'
        ? buckets.events
        : sec.id === 'notes'
          ? buckets.notes
          : buckets.done

  return (
    <section>
      <div className="group mb-2 flex items-center gap-1.5">
        <button
          onClick={onToggle}
          className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-3 hover:text-ink-2"
        >
          {sec.collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          {sectionLabel(t, sec.id)}
          <span className="text-ink-3/70">· {list.length}</span>
        </button>
        <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="text-ink-3 hover:text-ink-2 disabled:opacity-30"
            aria-label={t.project.moveUp}
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="text-ink-3 hover:text-ink-2 disabled:opacity-30"
            aria-label={t.project.moveDown}
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {!sec.collapsed && (
        <div className="rounded-xl border border-line bg-surface p-1.5">
          {sec.id === 'done' &&
            (list.length === 0 ? (
              <p className="px-1.5 py-2 text-[12px] text-ink-3">—</p>
            ) : (
              list.map((it) => <CompletedRow key={it.id} item={it} />)
            ))}

          {sec.id === 'events' &&
            (list.length === 0 ? (
              <p className="px-1.5 py-2 text-[12px] text-ink-3">—</p>
            ) : (
              list.map((it) => (
                <Link
                  key={it.id}
                  to={`/item/${it.id}`}
                  className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-surface-2"
                >
                  <span className="mono w-24 shrink-0 text-[11px] text-ink-3">
                    {new Date(it.start!).toLocaleDateString(dateLocale(), {
                      weekday: 'short',
                      day: 'numeric',
                    })}
                    {!it.allDay && ` ${fmtTime(it.start!)}`}
                    {isSameDay(it.start!, new Date()) && ' ·'}
                  </span>
                  <span className="truncate text-[12.5px]">{it.title}</span>
                </Link>
              ))
            ))}

          {sec.id === 'notes' && (
            <>
              {list.map((it) => (
                <Link
                  key={it.id}
                  to={`/item/${it.id}`}
                  className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 text-[12.5px] hover:bg-surface-2"
                >
                  <span className="truncate">{it.title}</span>
                </Link>
              ))}
              <InlineAdd placeholder={t.project.notes} onAdd={onAddNote} />
            </>
          )}

          {sec.id === 'tasks' && (
            <>
              {list.map((it) => (
                <ProjectTaskRow key={it.id} item={it} onDelete={() => askDelete(it.id, it.title)} />
              ))}
              <InlineAdd placeholder={t.project.newTaskPh} onAdd={onAddTask} />
            </>
          )}
        </div>
      )}
    </section>
  )
}

function InlineAdd({
  placeholder,
  onAdd,
}: {
  placeholder: string
  onAdd: (title: string) => void
}) {
  const [draft, setDraft] = useState('')
  function commit() {
    const v = draft.trim()
    if (v) onAdd(v)
    setDraft('')
  }
  return (
    <div className="flex items-center gap-2.5 px-1.5 py-1.5">
      <Plus size={13} className="shrink-0 text-ink-3" />
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
        }}
        onBlur={commit}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-ink-3"
      />
    </div>
  )
}

function ProjectTaskRow({ item, onDelete }: { item: Item; onDelete: () => void }) {
  const data = useStore((s) => s.data)
  const toggleDone = useStore((s) => s.toggleDone)
  const kids = useMemo(() => selectSubtasks(data, item.id), [data, item.id])
  const [open, setOpen] = useState(false)
  const doneKids = kids.filter((k) => k.status === 'done').length
  const done = item.status === 'done'

  return (
    <div>
      <div className="group flex items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-surface-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-4 w-4 shrink-0 items-center justify-center text-ink-3 hover:text-ink-2"
          aria-label="toggle subtasks"
        >
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
        <Checkbox checked={done} onChange={() => toggleDone(item.id)} />
        <Link
          to={`/item/${item.id}`}
          className={cn(
            'min-w-0 flex-1 truncate text-[12.5px] hover:text-iris-2',
            done && 'text-ink-3 line-through',
          )}
        >
          {item.title}
        </Link>
        {kids.length > 0 && (
          <span className="mono shrink-0 text-[10px] text-ink-3">
            {doneKids}/{kids.length}
          </span>
        )}
        <DueChip due={item.due} className="w-16 text-right" />
        <button
          onClick={onDelete}
          className="shrink-0 text-ink-3 opacity-0 hover:text-rose group-hover:opacity-100"
          aria-label="delete"
        >
          <Trash2 size={12} />
        </button>
      </div>
      {open && (
        <div className="ml-[26px] border-l border-line pl-2.5">
          <Subtasks parentId={item.id} />
        </div>
      )}
    </div>
  )
}
