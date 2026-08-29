import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Columns3, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { Button, EmptyState, SectionLabel, TextField, cn } from '@/components/ui'
import { Menu, ConfirmDialog } from '@/components/overlays'
import { CompletedRow, TaskRow } from '@/components/items'
import { useStore } from '@/lib/store'
import { fmtTime, isSameDay } from '@/lib/date'
import { PROJECT_COLORS } from '@/lib/types'
import type { Item } from '@/lib/types'

export function ProjectView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const project = useStore((s) => (id ? s.data.projects[id] : undefined))
  const items = useStore((s) => s.data.items)
  const updateProject = useStore((s) => s.updateProject)
  const deleteProject = useStore((s) => s.deleteProject)
  const openCapture = useStore((s) => s.openCapture)

  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState('')
  const [confirmDel, setConfirmDel] = useState(false)

  const buckets = useMemo(() => {
    const mine = Object.values(items).filter((it) => it.projectId === id)
    return {
      tasks: mine
        .filter((it) => it.kind === 'task' && it.status !== 'done')
        .sort((a, b) => (a.due ?? '9') < (b.due ?? '9') ? -1 : 1),
      events: mine
        .filter((it) => it.kind === 'event' && it.start && new Date(it.start) >= new Date(Date.now() - 86_400_000))
        .sort((a, b) => new Date(a.start!).getTime() - new Date(b.start!).getTime()),
      notes: mine.filter((it) => it.kind === 'note'),
      done: mine.filter((it) => it.kind === 'task' && it.status === 'done'),
    }
  }, [items, id])

  if (!project) {
    return (
      <>
        <TopBar>
          <h1 className="text-[16px]">Project not found</h1>
        </TopBar>
        <EmptyState title="That project is gone" hint="It may have been deleted." />
      </>
    )
  }

  const empty =
    buckets.tasks.length + buckets.events.length + buckets.notes.length + buckets.done.length === 0

  return (
    <>
      <TopBar>
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
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" className="text-[12px]" onClick={() => navigate(`/board?project=${project.id}`)}>
            <Columns3 size={13} />
            Board
          </Button>
          <Menu
            align="right"
            trigger={({ toggle }) => (
              <button onClick={toggle} className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink">
                <MoreHorizontal size={15} />
              </button>
            )}
            items={[
              {
                label: 'Rename',
                icon: <Pencil size={13} />,
                onSelect: () => {
                  setName(project.name)
                  setRenaming(true)
                },
              },
              'separator',
              ...PROJECT_COLORS.map((c) => ({
                label: (
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.value }} />
                    <span className="capitalize">{c.name}</span>
                  </span>
                ),
                onSelect: () => updateProject(project.id, { color: c.value }),
              })),
              'separator',
              {
                label: 'Delete project',
                icon: <Trash2 size={13} />,
                danger: true,
                onSelect: () => setConfirmDel(true),
              },
            ]}
          />
        </div>
      </TopBar>

      {empty ? (
        <EmptyState
          title="Nothing in this project yet"
          hint={`Capture with #${project.name.split(' ')[0].toLowerCase()} to file things here.`}
          action={<Button variant="accent" onClick={() => openCapture()}>Quick capture</Button>}
        />
      ) : (
        <div className="flex-1 overflow-y-auto px-8 py-7">
          <div className="mx-auto max-w-[640px]">
            <Bucket label={`Open tasks · ${buckets.tasks.length}`} items={buckets.tasks} render={(it) => <TaskRow key={it.id} item={it} />} />
            {buckets.events.length > 0 && (
              <div className="mb-6">
                <SectionLabel className="mb-2">Upcoming events · {buckets.events.length}</SectionLabel>
                <div className="rounded-xl border border-line bg-surface p-1.5">
                  {buckets.events.map((it) => (
                    <Link
                      key={it.id}
                      to={`/item/${it.id}`}
                      className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-surface-2"
                    >
                      <span className="mono w-24 shrink-0 text-[11px] text-ink-3">
                        {new Date(it.start!).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                        {!it.allDay && ` ${fmtTime(it.start!)}`}
                        {isSameDay(it.start!, new Date()) && ' ·'}
                      </span>
                      <span className="truncate text-[12.5px]">{it.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <Bucket label={`Notes · ${buckets.notes.length}`} items={buckets.notes} render={(it) => <TaskRow key={it.id} item={it} />} />
            {buckets.done.length > 0 && (
              <div className="mb-6">
                <SectionLabel className="mb-2">Done · {buckets.done.length}</SectionLabel>
                <div className="rounded-xl border border-line bg-surface p-1.5">
                  {buckets.done.map((it) => (
                    <CompletedRow key={it.id} item={it} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDel}
        title={`Delete “${project.name}”?`}
        body="Items in this project are kept — they just lose the project label."
        onConfirm={() => {
          deleteProject(project.id)
          navigate('/')
        }}
        onCancel={() => setConfirmDel(false)}
      />
    </>
  )
}

function Bucket({
  label,
  items,
  render,
}: {
  label: string
  items: Item[]
  render: (it: Item) => React.ReactNode
}) {
  if (items.length === 0) return null
  return (
    <div className={cn('mb-6')}>
      <SectionLabel className="mb-2">{label}</SectionLabel>
      <div className="rounded-xl border border-line bg-surface p-1.5">{items.map(render)}</div>
    </div>
  )
}
