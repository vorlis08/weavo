import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  Check,
  Link2,
  ListChecks,
  MoreHorizontal,
  Plus,
  TriangleAlert,
} from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { SourceIcon } from '@/components/SourceIcon'
import { Avatar, Badge, Button, Dot, Segmented, cn } from '@/components/ui'
import { contactById, contacts, projectById, tasks } from '@/lib/mockData'
import type { TaskItem } from '@/lib/types'

type ColKey = 'unsorted' | 'todo' | 'in_progress' | 'blocked' | 'done'

const COLUMNS: { key: ColKey; label: string; accent?: string }[] = [
  { key: 'unsorted', label: 'Unsorted', accent: 'var(--color-iris)' },
  { key: 'todo', label: 'To do' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'blocked', label: 'Blocked', accent: 'var(--color-rose)' },
  { key: 'done', label: 'Done' },
]

function KanbanCard({ task, highlight }: { task: TaskItem; highlight?: boolean }) {
  const navigate = useNavigate()
  const project = projectById(task.projectId)
  const assignee = task.contactIds.map(contactById).find(Boolean)
  const done = task.status === 'done'
  return (
    <button
      onClick={() => navigate(`/item/${task.id}`)}
      className={cn(
        'w-full rounded-lg border border-line bg-surface-2 px-[11px] py-2.5 text-left transition-[transform,border-color] hover:-translate-y-px hover:border-line-2',
        highlight && 'border-iris/40 ring-1 ring-inset ring-iris/15',
        done && 'opacity-60',
      )}
    >
      <div className="mb-1.5 flex items-center gap-[7px] text-[10px] text-ink-3">
        {project && <Dot color={project.color} />}
        <span>{project?.name ?? 'No project'}</span>
        {done ? (
          <Check size={13} strokeWidth={2} className="ml-auto text-sage" />
        ) : task.source ? (
          <span className="ml-auto">
            <SourceIcon source={task.source} size={16} />
          </span>
        ) : null}
      </div>
      <div
        className={cn(
          'text-[12.5px] leading-snug text-ink',
          done && 'text-ink-2 line-through',
        )}
      >
        {task.title}
      </div>
      <div className="mt-2 flex items-center gap-2.5 empty:hidden">
        {task.blockedBy.length > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-rose">
            <Link2 size={11} strokeWidth={1.8} />
            Blocked{task.blockedBy.length > 1 ? ` ×${task.blockedBy.length}` : ''}
          </span>
        )}
        {task.conflict && (
          <span className="flex items-center gap-1 text-[10px] text-rose">
            <TriangleAlert size={11} strokeWidth={1.8} />
            Conflict
          </span>
        )}
        {task.checklist && (
          <span className="flex items-center gap-1 text-[10px] text-ink-3">
            <ListChecks size={11} strokeWidth={1.8} />
            {task.checklist.done}/{task.checklist.total}
          </span>
        )}
        {task.status === 'blocked' &&
          (assignee ? (
            <span className="flex items-center gap-1.5 text-[10px] text-ink-3">
              Waiting on
            </span>
          ) : (
            <span className="text-[10px] text-rose">Waiting · 4 days</span>
          ))}
        {assignee && <Avatar contact={assignee} size={18} />}
      </div>
    </button>
  )
}

function UnsortedCard({
  kind,
  title,
  source,
  meta,
}: {
  kind: string
  title: string
  source?: 'slack' | 'gmail'
  meta?: React.ReactNode
}) {
  return (
    <div className="w-full rounded-lg border border-line bg-surface-2 px-[11px] py-2.5">
      <div className="mb-1.5 flex items-center gap-[7px] text-[10px] capitalize text-ink-3">
        <span className="h-1.5 w-1.5 rounded-full bg-ink-3" />
        {kind}
        {source && (
          <span className="ml-auto">
            <SourceIcon source={source} size={16} />
          </span>
        )}
      </div>
      <div className="text-[12.5px] leading-snug text-ink">{title}</div>
      {meta && <div className="mt-2">{meta}</div>}
    </div>
  )
}

export function Kanban() {
  const [scope, setScope] = useState<'all' | 'mine'>('all')

  const byStatus = (s: TaskItem['status']) =>
    tasks.filter((t) => t.status === s && !t.unsorted)

  return (
    <>
      <TopBar>
        <h1 className="flex items-center gap-2 text-[16px]">
          <Dot color="var(--color-amber)" />
          Q3 Launch board
        </h1>
        <div className="ml-1.5">
          <Segmented
            options={[
              { value: 'all', label: 'All' },
              { value: 'mine', label: 'Mine' },
            ]}
            value={scope}
            onChange={setScope}
          />
        </div>
        <Button variant="ghost" className="text-[12px]">
          Group: Status
        </Button>
        <div className="ml-auto flex items-center gap-3">
          <Segmented
            options={[
              { value: 'calendar', label: 'Calendar' },
              { value: 'kanban', label: 'Kanban' },
              { value: 'timeline', label: 'Timeline' },
            ]}
            value="kanban"
            onChange={() => {}}
          />
          <div className="flex">
            {contacts.map((c, n) => (
              <span
                key={c.id}
                className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-bg text-[9px] font-semibold"
                style={{
                  marginLeft: n ? -7 : 0,
                  background: c.tintBg,
                  color: c.tintFg,
                }}
              >
                {c.initials}
              </span>
            ))}
          </div>
          <Button variant="accent" className="h-[30px] text-[12px]">
            <Plus size={13} />
            Add
          </Button>
        </div>
      </TopBar>

      <div className="flex flex-1 gap-3.5 overflow-x-auto p-4 px-5">
        {COLUMNS.map((col) => {
          const items =
            col.key === 'unsorted'
              ? []
              : byStatus(col.key === 'todo' ? 'todo' : (col.key as TaskItem['status']))
          const count = col.key === 'unsorted' ? 7 : items.length

          return (
            <div
              key={col.key}
              className="flex w-[216px] shrink-0 flex-col overflow-hidden rounded-xl border border-line bg-surface"
              style={{ borderTop: `2px solid ${col.accent ?? 'var(--color-line-2)'}` }}
            >
              <div className="flex items-center gap-2 px-[13px] pb-2.5 pt-3">
                <span
                  className={cn(
                    'text-[12.5px] font-semibold',
                    col.key === 'done' && 'text-ink-2',
                  )}
                  style={{ color: col.accent ?? undefined }}
                >
                  {col.label}
                </span>
                <Badge tone={col.key === 'blocked' ? 'rose' : 'default'}>{count}</Badge>
                <MoreHorizontal size={13} className="ml-auto text-ink-3" />
              </div>

              <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-2.5 pb-3">
                {col.key === 'unsorted' && (
                  <>
                    <UnsortedCard kind="note" title="Bundle onboarding into Pro tier" source="slack" />
                    <UnsortedCard kind="task" title="Fix broken link in footer" source="gmail" />
                    <UnsortedCard
                      kind="event"
                      title="Coffee with recruiter"
                      meta={
                        <span className="flex items-center gap-1 text-[10px] text-amber">
                          <TriangleAlert size={11} strokeWidth={1.8} />
                          Needs a time
                        </span>
                      }
                    />
                    <button className="flex items-center gap-1.5 px-0.5 py-1 text-[11.5px] text-ink-3 hover:text-ink-2">
                      <Plus size={12} />
                      Add card
                    </button>
                  </>
                )}

                {col.key !== 'unsorted' &&
                  items.map((t) => (
                    <KanbanCard
                      key={t.id}
                      task={t}
                      highlight={t.id === 't-pricing'}
                    />
                  ))}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
