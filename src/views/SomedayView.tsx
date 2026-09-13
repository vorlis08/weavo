import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Clock9, Trash2 } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { EmptyState, cn } from '@/components/ui'
import { ProjectTag } from '@/components/items'
import { useConfirmDelete } from '@/components/useConfirmDelete'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import type { Item } from '@/lib/types'

export function SomedayView() {
  const t = useT()
  const navigate = useNavigate()
  const items = useStore((s) => s.data.items)
  const createItem = useStore((s) => s.createItem)
  const updateItem = useStore((s) => s.updateItem)
  const { askDelete, dialog } = useConfirmDelete()
  const [draft, setDraft] = useState('')

  const list = useMemo(
    () =>
      Object.values(items)
        .filter((it) => it.someday)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [items],
  )

  function commit() {
    const v = draft.trim()
    if (v) createItem({ kind: 'task', title: v, status: 'todo', someday: true })
    setDraft('')
  }

  return (
    <>
      <TopBar>
        <h1 className="text-[16px]">{t.nav.someday}</h1>
        {list.length > 0 && <span className="mono text-[11px] text-ink-3">{t.someday.count(list.length)}</span>}
      </TopBar>

      <div className="flex-1 overflow-y-auto px-7 py-6">
        <div className="mx-auto max-w-[640px]">
          <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-line bg-surface-2 px-3 py-2.5">
            <Clock9 size={14} strokeWidth={1.6} className="shrink-0 text-ink-3" />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit()
              }}
              onBlur={commit}
              placeholder={t.someday.addPh}
              className="flex-1 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-ink-3"
            />
          </div>

          {list.length === 0 ? (
            <EmptyState icon={<Clock9 size={20} />} title={t.someday.emptyTitle} hint={t.someday.emptyHint} />
          ) : (
            <div className="flex flex-col gap-1">
              {list.map((it) => (
                <SomedayRow
                  key={it.id}
                  item={it}
                  onOpen={() => navigate(`/item/${it.id}`)}
                  onPromote={() => updateItem(it.id, { someday: false })}
                  onDelete={() => askDelete(it.id, it.title)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {dialog}
    </>
  )
}

function SomedayRow({
  item,
  onOpen,
  onPromote,
  onDelete,
}: {
  item: Item
  onOpen: () => void
  onPromote: () => void
  onDelete: () => void
}) {
  const t = useT()
  return (
    <div className="group flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-surface-2">
      <button onClick={onOpen} className={cn('min-w-0 flex-1 truncate text-left text-[12.5px] text-ink hover:text-iris-2')}>
        {item.title}
      </button>
      {item.projectId && <ProjectTag projectId={item.projectId} />}
      <button
        onClick={onPromote}
        className="flex shrink-0 items-center gap-1 text-[11px] text-iris opacity-0 hover:text-iris-2 group-hover:opacity-100"
      >
        {t.someday.moveToToday}
        <ArrowRight size={11} />
      </button>
      <button onClick={onDelete} className="shrink-0 text-ink-3 opacity-0 hover:text-rose group-hover:opacity-100">
        <Trash2 size={12} />
      </button>
    </div>
  )
}
