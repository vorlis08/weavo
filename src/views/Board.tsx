import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { Flame, Plus } from 'lucide-react'
import { Badge, ProjectGlyph, cn } from '@/components/ui'
import { DueChip, SourceBadge } from '@/components/items'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { PRIORITY_RANK } from '@/lib/types'
import type { Item, Space, TaskPriority, TaskStatus } from '@/lib/types'

type ColKey = TaskStatus | 'unsorted'
const COLUMNS: { key: ColKey; accent?: string }[] = [
  { key: 'unsorted', accent: 'var(--color-iris)' },
  { key: 'todo' },
  { key: 'in_progress' },
  { key: 'blocked', accent: 'var(--color-rose)' },
  { key: 'done' },
]
const colLabel = (
  t: ReturnType<typeof useT>,
  key: ColKey,
): string => (key === 'unsorted' ? t.board.unsorted : t.status[key])

function CardBody({ item }: { item: Item }) {
  const t = useT()
  const project = useStore((s) => (item.projectId ? s.data.projects[item.projectId] : undefined))
  const allItems = useStore((s) => s.data.items)
  const openBlockerCount = (item.blockedBy ?? []).filter(
    (id) => allItems[id] && allItems[id].status !== 'done',
  ).length
  const done = item.status === 'done'
  const checkDone = item.checklist?.filter((c) => c.done).length ?? 0

  return (
    <div
      className={cn(
        'rounded-md border border-line bg-surface-2 px-3 py-2.5 transition-colors hover:border-line-3',
        done && 'opacity-60',
      )}
    >
      <div className="mb-1.5 flex items-center gap-[7px] text-xs text-ink-3">
        {project ? (
          <>
            <ProjectGlyph color={project.color} className="h-2 w-2 rounded-[2.5px]" />
            <span className="truncate">{project.name}</span>
          </>
        ) : (
          <span>{t.kind[item.kind]}</span>
        )}
        <span className="ml-auto flex items-center gap-1.5">
          {item.source && <SourceBadge source={item.source} size={12} />}
        </span>
      </div>
      <div className="flex items-start gap-1.5">
        {item.flame && !done && <Flame size={13} className="mt-0.5 shrink-0 text-flame" fill="currentColor" fillOpacity={0.28} />}
        <div className={cn('text-base leading-snug text-ink', done && 'text-ink-3 line-through')}>
          {item.priority === 'high' && !done && <span className="mr-1 font-bold text-rose">!</span>}
          {item.title}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2.5 empty:hidden">
        {openBlockerCount > 0 && (
          <span className="mono text-xs text-rose">
            {t.board.blocked}{openBlockerCount > 1 ? ` ×${openBlockerCount}` : ''}
          </span>
        )}
        {item.checklist && item.checklist.length > 0 && (
          <span className="mono text-xs text-ink-3">
            {checkDone}/{item.checklist.length}
          </span>
        )}
        <DueChip due={item.due} />
      </div>
    </div>
  )
}

function DraggableCard({ item }: { item: Item }) {
  const navigate = useNavigate()
  const openPeek = useStore((s) => s.openPeek)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => (item.kind === 'task' ? openPeek(item.id) : navigate(`/item/${item.id}`))}
      className={cn('cursor-grab touch-none active:cursor-grabbing', isDragging && 'opacity-30')}
    >
      <CardBody item={item} />
    </div>
  )
}

function Column({
  col,
  items,
  onAdd,
  tourAnchor,
}: {
  col: (typeof COLUMNS)[number]
  items: Item[]
  onAdd: (title: string) => void
  tourAnchor?: boolean
}) {
  const t = useT()
  const { setNodeRef, isOver } = useDroppable({ id: col.key })
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-[248px] shrink-0 flex-col overflow-hidden rounded-lg border bg-surface transition-colors',
        isOver ? 'border-iris/50' : 'border-line',
      )}
    >
      <div
        data-tour={tourAnchor ? 'board-col' : undefined}
        className="flex items-center gap-2 px-3.5 pb-2.5 pt-3.5"
      >
        <span
          className={cn('text-sm font-semibold', col.key === 'done' && 'text-ink-2')}
          style={{ color: col.accent ?? undefined }}
        >
          {colLabel(t, col.key)}
        </span>
        <Badge tone={col.key === 'blocked' ? 'rose' : 'default'}>{items.length}</Badge>
        <button
          onClick={() => {
            setAdding(true)
            setDraft('')
          }}
          className="ml-auto text-ink-3 hover:text-ink"
        >
          <Plus size={13} />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-2.5 pb-3">
        {items.map((it) => (
          <DraggableCard key={it.id} item={it} />
        ))}

        {adding && (
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              if (draft.trim()) onAdd(draft.trim())
              setAdding(false)
              setDraft('')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                ;(e.target as HTMLTextAreaElement).blur()
              } else if (e.key === 'Escape') {
                setDraft('')
                setAdding(false)
              }
            }}
            rows={2}
            placeholder={t.board.newTask}
            className="resize-none rounded-lg border border-line bg-surface-2 px-2.5 py-2 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-iris/50"
          />
        )}

        {items.length === 0 && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-0.5 py-1 text-xs text-ink-3 hover:text-ink-2"
          >
            <Plus size={12} />
            {t.board.addTask}
          </button>
        )}
      </div>
    </div>
  )
}

/** a project's own board (reached from the project page) */
/** old /board links: a project's board now lives on the project page */
export function Board() {
  const [params] = useSearchParams()
  const project = params.get('project')
  return <Navigate to={project ? `/project/${project}` : '/todo'} replace />
}

/** status columns with drag & drop — the To-do's kanban mode and the project board */
export function BoardColumns({ projectId: projectFilter, space }: { projectId?: string; space?: Space }) {
  const data = useStore((s) => s.data)
  const setStatus = useStore((s) => s.setStatus)
  const updateItem = useStore((s) => s.updateItem)
  const createItem = useStore((s) => s.createItem)

  const [dragId, setDragId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  )

  const cards = useMemo(
    () =>
      Object.values(data.items).filter((it) => {
        if (it.parentId) return false
        if (it.someday) return false
        if (it.kind === 'note' && !it.unsorted) return false
        if (it.kind === 'event' && !it.unsorted) return false
        if (projectFilter && it.projectId !== projectFilter) return false
        if (space && it.space !== space) return false
        return true
      }),
    [data.items, projectFilter, space],
  )

  function columnItems(key: string) {
    return cards
      .filter((it) => (key === 'unsorted' ? it.unsorted : !it.unsorted && it.status === key))
      .sort(
        (a, b) =>
          (a.boardOrder ?? 0) - (b.boardOrder ?? 0) ||
          rank(a.priority) - rank(b.priority) ||
          (a.createdAt < b.createdAt ? -1 : 1),
      )
  }

  function rank(p?: TaskPriority) {
    return p ? PRIORITY_RANK[p] : 3
  }

  function onDragEnd(e: DragEndEvent) {
    setDragId(null)
    const id = String(e.active.id)
    const target = e.over ? String(e.over.id) : null
    if (!target) return
    const maxOrder = Math.max(0, ...cards.map((c) => c.boardOrder ?? 0)) + 1
    if (target === 'unsorted') updateItem(id, { unsorted: true, boardOrder: maxOrder })
    else if (COLUMNS.some((c) => c.key === target))
      setStatus(id, target as TaskStatus, maxOrder)
  }

  const dragItem = dragId ? data.items[dragId] : null

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={(e: DragStartEvent) => setDragId(String(e.active.id))}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDragId(null)}
      >
        <div className="flex flex-1 gap-3.5 overflow-x-auto px-4 pb-4 md:px-5">
          {COLUMNS.map((col, i) => (
            <Column
              key={col.key}
              col={col}
              tourAnchor={i === 1}
              items={columnItems(col.key)}
              onAdd={(title) =>
                createItem({
                  kind: 'task',
                  title,
                  status: col.key === 'unsorted' ? 'todo' : (col.key as TaskStatus),
                  unsorted: col.key === 'unsorted' || undefined,
                  projectId: projectFilter,
                  space,
                })
              }
            />
          ))}
        </div>
        <DragOverlay>
          {dragItem ? (
            <div className="w-[194px] rotate-2">
              <CardBody item={dragItem} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  )
}
