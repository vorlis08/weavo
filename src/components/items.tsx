import { useNavigate } from 'react-router-dom'
import { CalendarDays, CircleCheck, FileText, ListChecks } from 'lucide-react'
import { useStore } from '@/lib/store'
import { fmtDue } from '@/lib/date'
import type { Item, ItemKind } from '@/lib/types'
import { Checkbox, Dot, cn } from './ui'

export function KindIcon({ kind, size = 14 }: { kind: ItemKind; size?: number }) {
  const Icon = kind === 'event' ? CalendarDays : kind === 'note' ? FileText : ListChecks
  return <Icon size={size} strokeWidth={1.6} />
}

export function ProjectTag({
  projectId,
  className,
}: {
  projectId?: string
  className?: string
}) {
  const project = useStore((s) => (projectId ? s.data.projects[projectId] : undefined))
  if (!project) return null
  return (
    <span className={cn('flex items-center gap-1.5 text-[11px] text-ink-3', className)}>
      <Dot color={project.color} />
      {project.name}
    </span>
  )
}

export function DueChip({ due, className }: { due?: string; className?: string }) {
  const d = fmtDue(due)
  if (!d) return null
  return (
    <span
      className={cn(
        'mono shrink-0 text-[10.5px]',
        d.overdue ? 'text-rose' : 'text-ink-3',
        className,
      )}
    >
      {d.label}
    </span>
  )
}

export function TaskRow({ item }: { item: Item }) {
  const navigate = useNavigate()
  const toggleDone = useStore((s) => s.toggleDone)
  const project = useStore((s) => (item.projectId ? s.data.projects[item.projectId] : undefined))
  const done = item.kind === 'task' ? item.status === 'done' : !!item.completedAt
  const allItems = useStore((s) => s.data.items)
  const isBlocked = (item.blockedBy ?? []).some(
    (id) => allItems[id] && allItems[id].status !== 'done',
  )

  return (
    <button
      onClick={() => navigate(`/item/${item.id}`)}
      className="group flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-surface-2"
    >
      {item.kind === 'note' ? (
        <FileText size={15} strokeWidth={1.6} className="shrink-0 text-ink-3" />
      ) : (
        <Checkbox checked={done} onChange={() => toggleDone(item.id)} />
      )}
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-[12.5px]',
          done && 'text-ink-3 line-through',
        )}
      >
        {item.title}
      </span>
      {isBlocked && <span className="mono shrink-0 text-[10px] text-rose">blocked</span>}
      {project && <Dot color={project.color} />}
      <DueChip due={item.due} className="w-16 text-right" />
    </button>
  )
}

export function CompletedRow({ item }: { item: Item }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(`/item/${item.id}`)}
      className="flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left opacity-45 transition-opacity hover:opacity-70"
    >
      <CircleCheck size={15} strokeWidth={1.6} className="shrink-0 text-sage" />
      <span className="min-w-0 flex-1 truncate text-[12.5px] line-through">{item.title}</span>
    </button>
  )
}
