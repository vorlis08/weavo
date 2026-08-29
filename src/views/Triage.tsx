import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Inbox, Trash2 } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { EmptyState, Select, cn } from '@/components/ui'
import { KindIcon } from '@/components/items'
import { useStore } from '@/lib/store'

export function Triage() {
  const navigate = useNavigate()
  const itemsRec = useStore((s) => s.data.items)
  const projectsRec = useStore((s) => s.data.projects)
  const unsorted = useMemo(
    () =>
      Object.values(itemsRec)
        .filter((it) => it.unsorted)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [itemsRec],
  )
  const projects = useMemo(() => Object.values(projectsRec), [projectsRec])
  const updateItem = useStore((s) => s.updateItem)
  const deleteItem = useStore((s) => s.deleteItem)
  const toast = useStore((s) => s.toast)

  function file(id: string) {
    updateItem(id, { unsorted: undefined })
    toast('Filed')
  }

  return (
    <>
      <TopBar>
        <h1 className="text-[16px]">Unsorted</h1>
        {unsorted.length > 0 && <span className="mono text-ink-3">{unsorted.length} to process</span>}
      </TopBar>

      {unsorted.length === 0 ? (
        <EmptyState
          icon={<Inbox size={22} strokeWidth={1.5} />}
          title="Inbox zero"
          hint="Anything you capture without a home lands here for a quick sort later."
        />
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto flex max-w-[720px] flex-col gap-2">
            {unsorted.map((it) => (
              <div
                key={it.id}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-3"
              >
                <span className="text-ink-3">
                  <KindIcon kind={it.kind} size={16} />
                </span>
                <button
                  onClick={() => navigate(`/item/${it.id}`)}
                  className="min-w-0 flex-1 truncate text-left text-[13px] hover:text-iris-2"
                >
                  {it.title}
                </button>

                <Select
                  value={it.projectId ?? ''}
                  onChange={(e) => updateItem(it.id, { projectId: e.target.value || undefined })}
                  className={cn('h-7 w-[140px] text-[11.5px]')}
                >
                  <option value="">No project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>

                <button
                  onClick={() => navigate(`/item/${it.id}`)}
                  title="Open to add details"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-line-2 text-ink-3 hover:text-ink"
                >
                  <ArrowRight size={13} />
                </button>
                <button
                  onClick={() => file(it.id)}
                  title="File (remove from unsorted)"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-line-2 text-ink-3 hover:border-sage/40 hover:text-sage"
                >
                  <Check size={13} />
                </button>
                <button
                  onClick={() => {
                    deleteItem(it.id)
                    toast('Deleted')
                  }}
                  title="Delete"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-line-2 text-ink-3 hover:border-rose/40 hover:text-rose"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
