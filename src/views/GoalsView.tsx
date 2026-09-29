import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArchiveRestore, Plus, Target } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { ReflectionTabs } from '@/components/ReflectionTabs'
import { Button, EmptyState, SectionLabel, cn } from '@/components/ui'
import { Modal } from '@/components/overlays'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { goalStats } from '@/lib/selectors'
import { PROJECT_COLORS } from '@/lib/types'
import type { Goal } from '@/lib/types'

export function GoalsView() {
  const t = useT()
  const navigate = useNavigate()
  const data = useStore((s) => s.data)
  const addGoal = useStore((s) => s.addGoal)
  const updateGoal = useStore((s) => s.updateGoal)

  const [dialog, setDialog] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(PROJECT_COLORS[0].value)

  const { active, archived } = useMemo(() => {
    const all = Object.values(data.goals).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
    return { active: all.filter((g) => !g.archived), archived: all.filter((g) => g.archived) }
  }, [data.goals])

  function create() {
    const n = name.trim()
    if (!n) return
    const g = addGoal(n, color)
    setName('')
    setColor(PROJECT_COLORS[0].value)
    setDialog(false)
    navigate(`/goal/${g.id}`)
  }

  return (
    <>
      <TopBar>
        <h1 className="text-lg">{t.nav.reflection}</h1>
        <ReflectionTabs />
        <Button variant="accent" className="ml-auto h-[30px] text-sm" onClick={() => setDialog(true)}>
          <Plus size={13} />
          {t.goals.newGoal}
        </Button>
      </TopBar>

      {active.length === 0 && archived.length === 0 ? (
        <EmptyState
          icon={<Target size={20} />}
          title={t.goals.noGoalsTitle}
          hint={t.goals.noGoalsHint}
          action={
            <Button variant="accent" onClick={() => setDialog(true)}>
              {t.goals.newGoal}
            </Button>
          }
        />
      ) : (
        <div className="flex-1 overflow-y-auto px-7 py-6">
          <div className="mx-auto max-w-[1100px]">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3.5">
              {active.map((g) => (
                <GoalCard key={g.id} goal={g} onOpen={() => navigate(`/goal/${g.id}`)} />
              ))}
            </div>

            {archived.length > 0 && (
              <div className="mt-9">
                <SectionLabel className="mb-2.5">{t.goals.archivedSection(archived.length)}</SectionLabel>
                <div className="flex flex-col gap-1.5">
                  {archived.map((g) => (
                    <div key={g.id} className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: g.color }} />
                      <button
                        onClick={() => navigate(`/goal/${g.id}`)}
                        className="min-w-0 flex-1 truncate text-left text-sm text-ink-2 hover:text-ink"
                      >
                        {g.title}
                      </button>
                      <button
                        onClick={() => updateGoal(g.id, { archived: undefined })}
                        className="flex items-center gap-1.5 text-xs text-ink-3 hover:text-ink-2"
                      >
                        <ArchiveRestore size={13} />
                        {t.goals.unarchive}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Modal open={dialog} onClose={() => setDialog(false)} title={t.goals.newGoal} width={380}>
        <div className="p-5">
          <SectionLabel>{t.goals.newGoalName}</SectionLabel>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') create()
            }}
            placeholder={t.goals.newGoalName}
            className="mt-1.5 h-8 w-full rounded-lg border border-line bg-surface-2 px-2.5 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-iris/50"
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
              {t.goals.create}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

function GoalCard({ goal, onOpen }: { goal: Goal; onOpen: () => void }) {
  const t = useT()
  const data = useStore((s) => s.data)
  const stats = useMemo(() => goalStats(data, goal.id), [data, goal.id])

  return (
    <button
      onClick={onOpen}
      className="flex flex-col rounded-xl border border-line bg-surface p-3.5 text-left transition-colors hover:border-line-2"
    >
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: goal.color }} />
        <span className="min-w-0 flex-1 truncate text-base font-medium text-ink">{goal.title}</span>
      </div>

      {goal.description && (
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-3">{goal.description}</p>
      )}

      <div className="mt-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${stats.pct}%`, background: goal.color }}
          />
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-xs text-ink-3">
          <span>{t.project.tasksSummary(stats.done, stats.total)}</span>
        </div>
      </div>

      <div className="mt-2.5 text-xs text-ink-3">{t.goals.projectsSummary(stats.projectCount)}</div>
    </button>
  )
}
