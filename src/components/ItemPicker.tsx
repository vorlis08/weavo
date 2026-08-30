import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import type { Item, ItemKind } from '@/lib/types'
import { Modal } from './overlays'
import { KindIcon } from './items'
import { cn } from './ui'

export function ItemPicker({
  open,
  title,
  kinds,
  exclude = [],
  onPick,
  onClose,
}: {
  open: boolean
  title: string
  kinds: ItemKind[]
  exclude?: string[]
  onPick: (item: Item) => void
  onClose: () => void
}) {
  const t = useT()
  const items = useStore((s) => s.data.items)
  const createItem = useStore((s) => s.createItem)
  const [q, setQ] = useState('')

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return Object.values(items)
      .filter((it) => kinds.includes(it.kind) && !exclude.includes(it.id))
      .filter((it) => !needle || it.title.toLowerCase().includes(needle))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      .slice(0, 40)
  }, [items, kinds, exclude, q])

  function reset() {
    setQ('')
    onClose()
  }

  return (
    <Modal open={open} onClose={reset} title={title} width={440} align="top">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <Search size={14} className="text-ink-3" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.picker.searchOrCreate}
          className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-3"
        />
      </div>
      <div className="max-h-[50vh] overflow-y-auto p-1.5">
        {q.trim() && !matches.some((m) => m.title.toLowerCase() === q.trim().toLowerCase()) && (
          <button
            onClick={() => {
              const it = createItem({ kind: kinds[0], title: q.trim() })
              onPick(it)
              reset()
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] text-iris-2 hover:bg-iris/10"
          >
            <Plus size={14} />
            {t.picker.create(t.kind[kinds[0]].toLowerCase(), q.trim())}
          </button>
        )}
        {matches.map((it) => (
          <button
            key={it.id}
            onClick={() => {
              onPick(it)
              reset()
            }}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] text-ink-2 hover:bg-surface-2 hover:text-ink',
            )}
          >
            <span className="text-ink-3">
              <KindIcon kind={it.kind} />
            </span>
            <span className="truncate">{it.title}</span>
          </button>
        ))}
        {matches.length === 0 && !q.trim() && (
          <p className="px-2.5 py-6 text-center text-[12px] text-ink-3">{t.picker.nothingToPick}</p>
        )}
      </div>
    </Modal>
  )
}
