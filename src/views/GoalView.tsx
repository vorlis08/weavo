import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Archive, ArchiveRestore, ChevronLeft, MoreHorizontal, Pencil, Trash2, X } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { Button, EmptyState, SectionLabel, Select, TextField, cn } from '@/components/ui'
import { ConfirmDialog, Menu } from '@/components/overlays'
import { InlineBody } from '@/components/editors'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { goalStats, projectStats } from '@/lib/selectors'
import { PROJECT_COLORS } from '@/lib/types'

export function GoalView() {
  const t = useT()
  const { id } = useParams()
  const navigate = useNavigate()
  const data = useStore((s) => s.data)
  const goal = useStore((s) => (id ? s.data.goals[id] : undefined))
  const updateGoal = useStore((s) => s.updateGoal)
  const deleteGoal = useStore((s) => s.deleteGoal)
  const updateProject = useStore((s) => s.updateProject)

  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState('')
  const [confirmDel, setConfirmDel] = useState(false)

  const stats = useMemo(() => (id ? goalStats(data, id) : null), [data, id])
  const linked = useMemo(
    () => (id ? Object.values(data.projects).filter((p) => p.goalId === id) : []),
    [data.projects, id],
  )
  const linkable = useMemo(
    () => Object.values(data.projects).filter((p) => p.goalId !== id && !p.archived),
    [data.projects, id],
  )

  if (!goal) {
    return (
      <>
        <TopBar>
          <h1 className="text-[16px]">{t.goals.notFoundTitle}</h1>
        </TopBar>
        <EmptyState title={t.goals.notFoundTitle} hint={t.goals.notFoundBody} />
      </>
    )
  }

  return (
    <>
      <TopBar>
        <Button variant="ghost" square onClick={() => navigate('/goals')}>
          <ChevronLeft size={16} />
        </Button>
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: goal.color }} />
        {renaming ? (
          <TextField
            autoFocus
            defaultValue={goal.title}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              if (name.trim()) updateGoal(goal.id, { title: name.trim() })
              setRenaming(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') setRenaming(false)
            }}
            className="h-7 w-[220px]"
          />
        ) : (
          <h1 className="text-[16px]">{goal.title}</h1>
        )}
        {goal.archived && (
          <span className="mono text-[10px] uppercase tracking-wider text-ink-3">{t.goals.archivedTag}</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Menu
            align="right"
            trigger={({ toggle }) => (
              <button onClick={toggle} className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink">
                <MoreHorizontal size={15} />
              </button>
            )}
            items={[
              {
                label: t.goals.rename,
                icon: <Pencil size={13} />,
                onSelect: () => {
                  setName(goal.title)
                  setRenaming(true)
                },
              },
              {
                label: goal.archived ? t.goals.unarchive : t.goals.archive,
                icon: goal.archived ? <ArchiveRestore size={13} /> : <Archive size={13} />,
                onSelect: () => updateGoal(goal.id, { archived: goal.archived ? undefined : true }),
              },
              'separator',
              {
                label: t.goals.deleteGoal,
                icon: <Trash2 size={13} />,
                danger: true,
                onSelect: () => setConfirmDel(true),
              },
            ]}
          />
        </div>
      </TopBar>

      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="mx-auto max-w-[720px]">
          <div className="flex flex-wrap items-center gap-x-7 gap-y-2.5 text-[12px] text-ink-3">
            <label className="flex items-center gap-2">
              <span>{t.goals.targetDate}</span>
              <input
                type="date"
                value={goal.targetDate ? goal.targetDate.slice(0, 10) : ''}
                onChange={(e) =>
                  updateGoal(goal.id, {
                    targetDate: e.target.value ? new Date(e.target.value + 'T00:00').toISOString() : undefined,
                  })
                }
                className="h-7 rounded-lg border border-line bg-surface-2 px-2 text-[11.5px] text-ink outline-none [color-scheme:dark] focus:border-iris/50"
              />
            </label>

            <div className="flex gap-1.5">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c.name}
                  onClick={() => updateGoal(goal.id, { color: c.value })}
                  className={cn(
                    'h-4 w-4 rounded-full ring-offset-2 ring-offset-surface transition-shadow',
                    goal.color === c.value && 'ring-2 ring-white/40',
                  )}
                  style={{ background: c.value }}
                  aria-label={t.project.colors[c.name]}
                />
              ))}
            </div>

            {stats && stats.total > 0 && (
              <div className="flex items-center gap-2">
                <span>{t.goals.progress}</span>
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-3">
                  <div className="h-full rounded-full" style={{ width: `${stats.pct}%`, background: goal.color }} />
                </div>
                <span className="mono text-[10.5px]">{stats.pct}%</span>
              </div>
            )}
          </div>

          <div className="mt-6 min-h-[2em] text-[14px]">
            <InlineBody
              value={goal.description ?? ''}
              onCommit={(v) => updateGoal(goal.id, { description: v || undefined })}
              placeholder={t.goals.pageBodyPlaceholder}
            />
          </div>

          <div className="mt-9">
            <div className="mb-2 flex items-center gap-2">
              <SectionLabel>{t.goals.linkedProjects}</SectionLabel>
              {linked.length > 0 && <span className="text-ink-3/70 text-[10.5px]">· {linked.length}</span>}
            </div>

            <div className="rounded-xl border border-line bg-surface p-1.5">
              {linked.length === 0 ? (
                <p className="px-2 py-2.5 text-[12px] text-ink-3">{t.goals.noLinkedProjects}</p>
              ) : (
                linked.map((p) => <LinkedProjectRow key={p.id} projectId={p.id} onUnlink={() => updateProject(p.id, { goalId: undefined })} />)
              )}
            </div>

            {linkable.length > 0 && (
              <div className="mt-2.5">
                <Select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) updateProject(e.target.value, { goalId: goal.id })
                  }}
                  className="h-8 w-auto min-w-[220px]"
                >
                  <option value="">{t.goals.linkedProjects}…</option>
                  {linkable.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDel}
        title={t.goals.deleteConfirmTitle(goal.title)}
        body={t.goals.deleteConfirmBody}
        onConfirm={() => {
          deleteGoal(goal.id)
          navigate('/goals')
        }}
        onCancel={() => setConfirmDel(false)}
      />
    </>
  )
}

function LinkedProjectRow({ projectId, onUnlink }: { projectId: string; onUnlink: () => void }) {
  const t = useT()
  const data = useStore((s) => s.data)
  const project = data.projects[projectId]
  const stats = useMemo(() => projectStats(data, projectId), [data, projectId])
  if (!project) return null
  return (
    <div className="group flex items-center gap-2.5 rounded-md px-2 py-2 hover:bg-surface-2">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: project.color }} />
      <Link to={`/project/${project.id}`} className="min-w-0 flex-1 truncate text-[12.5px] hover:text-iris-2">
        {project.name}
      </Link>
      <span className="mono shrink-0 text-[10px] text-ink-3">{t.project.tasksSummary(stats.done, stats.total)}</span>
      <button onClick={onUnlink} className="shrink-0 text-ink-3 opacity-0 hover:text-rose group-hover:opacity-100">
        <X size={12} />
      </button>
    </div>
  )
}
