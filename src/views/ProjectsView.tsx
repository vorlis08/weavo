import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArchiveRestore, FolderPlus, Plus } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { Button, EmptyState, SectionLabel, cn } from '@/components/ui'
import { Modal } from '@/components/overlays'
import { DueChip } from '@/components/items'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { projectStats } from '@/lib/selectors'
import { PROJECT_COLORS } from '@/lib/types'
import type { Project } from '@/lib/types'

export function ProjectsView() {
  const t = useT()
  const navigate = useNavigate()
  const data = useStore((s) => s.data)
  const addProject = useStore((s) => s.addProject)
  const updateProject = useStore((s) => s.updateProject)

  const [dialog, setDialog] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(PROJECT_COLORS[0].value)

  const { active, archived } = useMemo(() => {
    const all = Object.values(data.projects).sort((a, b) =>
      (a.createdAt ?? '') < (b.createdAt ?? '') ? -1 : 1,
    )
    return {
      active: all.filter((p) => !p.archived),
      archived: all.filter((p) => p.archived),
    }
  }, [data.projects])

  function create() {
    const n = name.trim()
    if (!n) return
    const p = addProject(n, color)
    setName('')
    setColor(PROJECT_COLORS[0].value)
    setDialog(false)
    navigate(`/project/${p.id}`)
  }

  return (
    <>
      <TopBar>
        <h1 className="text-[16px]">{t.project.overviewTitle}</h1>
        <Button variant="accent" className="ml-auto h-[30px] text-[12px]" onClick={() => setDialog(true)}>
          <Plus size={13} />
          {t.project.newProject}
        </Button>
      </TopBar>

      {active.length === 0 && archived.length === 0 ? (
        <EmptyState
          icon={<FolderPlus size={20} />}
          title={t.project.noProjectsTitle}
          hint={t.project.noProjectsHint}
          action={
            <Button variant="accent" onClick={() => setDialog(true)}>
              {t.project.newProject}
            </Button>
          }
        />
      ) : (
        <div className="flex-1 overflow-y-auto px-7 py-6">
          <div className="mx-auto max-w-[1100px]">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3.5">
              {active.map((p) => (
                <ProjectCard key={p.id} project={p} onOpen={() => navigate(`/project/${p.id}`)} />
              ))}
            </div>

            {archived.length > 0 && (
              <div className="mt-9">
                <SectionLabel className="mb-2.5">{t.project.archivedSection(archived.length)}</SectionLabel>
                <div className="flex flex-col gap-1.5">
                  {archived.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-2"
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
                      <button
                        onClick={() => navigate(`/project/${p.id}`)}
                        className="min-w-0 flex-1 truncate text-left text-[12.5px] text-ink-2 hover:text-ink"
                      >
                        {p.name}
                      </button>
                      <button
                        onClick={() => updateProject(p.id, { archived: undefined })}
                        className="flex items-center gap-1.5 text-[11px] text-ink-3 hover:text-ink-2"
                      >
                        <ArchiveRestore size={13} />
                        {t.project.unarchive}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Modal open={dialog} onClose={() => setDialog(false)} title={t.project.newProject} width={380}>
        <div className="p-5">
          <SectionLabel>{t.project.newProjectName}</SectionLabel>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') create()
            }}
            placeholder={t.project.newProjectName}
            className="mt-1.5 h-8 w-full rounded-lg border border-line bg-surface-2 px-2.5 text-[12.5px] text-ink outline-none placeholder:text-ink-3 focus:border-iris/50"
          />
          <div className="mt-3.5 flex gap-2">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c.name}
                onClick={() => setColor(c.value)}
                className={cn(
                  'h-6 w-6 rounded-full ring-offset-2 ring-offset-surface transition-shadow',
                  color === c.value && 'ring-2 ring-iris',
                )}
                style={{ background: c.value }}
                aria-label={c.name}
              />
            ))}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button onClick={() => setDialog(false)}>{t.common.cancel}</Button>
            <Button variant="accent" onClick={create} disabled={!name.trim()}>
              {t.project.create}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

function ProjectCard({ project, onOpen }: { project: Project; onOpen: () => void }) {
  const t = useT()
  const data = useStore((s) => s.data)
  const stats = useMemo(() => projectStats(data, project.id), [data, project.id])

  return (
    <button
      onClick={onOpen}
      className="flex flex-col rounded-xl border border-line bg-surface p-3.5 text-left transition-colors hover:border-line-2"
    >
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: project.color }} />
        <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink">{project.name}</span>
      </div>

      {project.description && (
        <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-relaxed text-ink-3">
          {project.description}
        </p>
      )}

      <div className="mt-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${stats.pct}%`, background: project.color }}
          />
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-[10.5px] text-ink-3">
          <span>{t.project.tasksSummary(stats.done, stats.total)}</span>
          {stats.overdue > 0 && (
            <span className="text-rose">{t.project.overdueSummary(stats.overdue)}</span>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-2 text-[10.5px] text-ink-3">
        <span>{t.project.openSummary(stats.openTasks)}</span>
        {stats.nextDue && (
          <>
            <span>·</span>
            <DueChip due={stats.nextDue} />
          </>
        )}
      </div>
    </button>
  )
}
