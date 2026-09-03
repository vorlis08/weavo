import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { subtasks as selectSubtasks } from '@/lib/selectors'
import { useConfirmDelete } from './useConfirmDelete'
import { Checkbox, cn } from './ui'

/** Reusable subtask list with inline add — used in the record detail and project views. */
export function Subtasks({ parentId }: { parentId: string }) {
  const t = useT()
  const data = useStore((s) => s.data)
  const toggleDone = useStore((s) => s.toggleDone)
  const addSubtask = useStore((s) => s.addSubtask)
  const { askDelete, dialog } = useConfirmDelete()
  const [draft, setDraft] = useState('')

  const kids = useMemo(() => selectSubtasks(data, parentId), [data, parentId])

  function commit() {
    const v = draft.trim()
    if (v) addSubtask(parentId, v)
    setDraft('')
  }

  return (
    <div className="flex flex-col gap-1">
      {kids.map((k) => {
        const done = k.status === 'done'
        return (
          <div
            key={k.id}
            className="group flex items-center gap-2.5 rounded-md px-1 py-1 hover:bg-surface-2"
          >
            <Checkbox checked={done} onChange={() => toggleDone(k.id)} />
            <Link
              to={`/item/${k.id}`}
              className={cn(
                'min-w-0 flex-1 truncate text-[12.5px] hover:text-iris-2',
                done && 'text-ink-3 line-through',
              )}
            >
              {k.title}
            </Link>
            <button
              onClick={() => askDelete(k.id, k.title)}
              className="text-ink-3 opacity-0 hover:text-rose group-hover:opacity-100"
              aria-label={t.common.delete}
            >
              <X size={12} />
            </button>
          </div>
        )
      })}
      {dialog}
      <div className="flex items-center gap-2.5 px-1 py-1">
        <Plus size={12} className="shrink-0 text-ink-3" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            }
            if (e.key === 'Escape') setDraft('')
          }}
          onBlur={commit}
          placeholder={t.detail.newSubtaskPh}
          className="flex-1 bg-transparent text-[12px] text-ink outline-none placeholder:text-ink-3"
        />
      </div>
    </div>
  )
}
