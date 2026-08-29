import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
import { Plus } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { Avatar, Badge, Segmented, cn } from '@/components/ui'
import { DueChip } from '@/components/items'
import { useStore } from '@/lib/store'
import type { Item, TaskStatus } from '@/lib/types'

const COLUMNS: { key: TaskStatus | 'unsorted'; label: string; accent?: string }[] = [
  { key: 'unsorted', label: 'Unsorted', accent: 'var(--color-iris)' },
  { key: 'todo', label: 'To do' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'blocked', label: 'Blocked', accent: 'var(--color-rose)' },
  { key: 'done', label: 'Done' },
]

function CardBody({ item }: { item: Item }) {
  const project = useStore((s) => (item.projectId ? s.data.projects[item.projectId] : undefined))
  const assignee = useStore((s) => (item.assigneeId ? s.data.contacts[item.assigneeId] : undefined))
  const allItems = useStore((s) => s.data.items)
  const openBlockerCount = (item.blockedBy ?? []).filter(
    (id) => allItems[id] && allItems[id].status !== 'done',
  ).length
  const done = item.status === 'done'
  const checkDone = item.checklist?.filter((c) => c.done).length ?? 0

  return (
    <div
      className={cn(
        'rounded-lg border border-line bg-surface-2 px-[11px] py-2.5',
        done && 'opacity-60',
      )}
    >
      <div className="mb-1.5 flex items-center gap-[7px] text-[10px] text-ink-3">
        {project ? (
          <>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: project.color }} />
            <span className="truncate">{project.name}</span>
          </>
        ) : (
          <span className="capitalize">{item.kind}</span>
        )}
        {assignee && (
          <span className="ml-auto">
            <Avatar name={assignee.name} size={16} />
          </span>
        )}
      </div>
      <div className={cn('text-[12.5px] leading-snug text-ink', done && 'text-ink-2 line-through')}>
        {item.title}
      </div>
      <div className="mt-2 flex items-center gap-2.5 empty:hidden">
        {openBlockerCount > 0 && (
          <span className="mono text-[10px] text-rose">
            blocked{openBlockerCount > 1 ? ` ×${openBlockerCount}` : ''}
          </span>
        )}
        {item.checklist && item.checklist.length > 0 && (
          <span className="mono text-[10px] text-ink-3">
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
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => navigate(`/item/${item.id}`)}
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
}: {
  col: (typeof COLUMNS)[number]
  items: Item[]
  onAdd: (title: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key })
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-[214px] shrink-0 flex-col overflow-hidden rounded-xl border bg-surface transition-colors',
        isOver ? 'border-iris/50' : 'border-line',
      )}
      style={{ borderTop: `2px solid ${col.accent ?? 'var(--color-line-2)'}` }}
    >
      <div className="flex items-center gap-2 px-[13px] pb-2.5 pt-3">
        <span
          className={cn('text-[12.5px] font-semibold', col.key === 'done' && 'text-ink-2')}
          style={{ color: col.accent ?? undefined }}
        >
          {col.label}
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
            placeholder="New task…"
            className="resize-none rounded-lg border border-line bg-surface-2 px-2.5 py-2 text-[12px] text-ink outline-none placeholder:text-ink-3 focus:border-iris/50"
          />
        )}

        {items.length === 0 && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-0.5 py-1 text-[11.5px] text-ink-3 hover:text-ink-2"
          >
            <Plus size={12} />
            Add task
          </button>
        )}
      </div>
    </div>
  )
}

export function Board() {
  const [params, setParams] = useSearchParams()
  const projectFilter = params.get('project') ?? undefined
  const data = useStore((s) => s.data)
  const setStatus = useStore((s) => s.setStatus)
  const updateItem = useStore((s) => s.updateItem)
  const createItem = useStore((s) => s.createItem)

  const [scope, setScope] = useState<'all' | 'mine'>('all')
  const [dragId, setDragId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  )

  const meContact = useMemo(
    () =>
      Object.values(data.contacts).find(
        (c) => c.name.toLowerCase() === data.settings.displayName.toLowerCase(),
      ),
    [data.contacts, data.settings.displayName],
  )

  const cards = useMemo(
    () =>
      Object.values(data.items).filter((it) => {
        if (it.kind === 'note' && !it.unsorted) return false
        if (it.kind === 'event' && !it.unsorted) return false
        if (projectFilter && it.projectId !== projectFilter) return false
        if (scope === 'mine' && meContact && it.assigneeId !== meContact.id) return false
        return true
      }),
    [data.items, projectFilter, scope, meContact],
  )

  function columnItems(key: string) {
    return cards
      .filter((it) => (key === 'unsorted' ? it.unsorted : !it.unsorted && it.status === key))
      .sort(
        (a, b) =>
          (a.boardOrder ?? 0) - (b.boardOrder ?? 0) || (a.createdAt < b.createdAt ? -1 : 1),
      )
  }

  function onDragEnd(e: DragEndEvent) {
    setDragId(null)
    const id = String(e.active.id)
    const target = e.over ? String(e.over.id) : null
    if (!target) return
    const maxOrder = Math.max(0, ...cards.map((t) => t.boardOrder ?? 0)) + 1
    if (target === 'unsorted') updateItem(id, { unsorted: true, boardOrder: maxOrder })
    else if (COLUMNS.some((c) => c.key === target))
      setStatus(id, target as TaskStatus, maxOrder)
  }

  const dragItem = dragId ? data.items[dragId] : null
  const projectName = projectFilter ? data.projects[projectFilter]?.name : null

  return (
    <>
      <TopBar>
        <h1 className="flex items-center gap-2 text-[16px]">
          {projectName ? (
            <>
              <span
                className="h-[7px] w-[7px] rounded-full"
                style={{ background: data.projects[projectFilter!]?.color }}
              />
              {projectName} board
            </>
          ) : (
            'Board'
          )}
        </h1>
        {projectFilter && (
          <button onClick={() => setParams({})} className="text-[11.5px] text-ink-3 hover:text-ink-2">
            clear filter
          </button>
        )}
        {data.settings.displayName && (
          <div className="ml-2">
            <Segmented
              options={[
                { value: 'all', label: 'All' },
                { value: 'mine', label: 'Mine' },
              ]}
              value={scope}
              onChange={setScope}
            />
          </div>
        )}
        <span className="mono ml-auto text-[11px] text-ink-3">drag cards between columns</span>
      </TopBar>

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={(e: DragStartEvent) => setDragId(String(e.active.id))}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDragId(null)}
      >
        <div className="flex flex-1 gap-3.5 overflow-x-auto p-4 px-5">
          {COLUMNS.map((col) => (
            <Column
              key={col.key}
              col={col}
              items={columnItems(col.key)}
              onAdd={(title) =>
                createItem({
                  kind: 'task',
                  title,
                  status: col.key === 'unsorted' ? 'todo' : (col.key as TaskStatus),
                  unsorted: col.key === 'unsorted' || undefined,
                  projectId: projectFilter,
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
