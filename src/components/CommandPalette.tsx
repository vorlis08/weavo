import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Plus, Search } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { views } from '@/lib/nav'
import type { ItemKind } from '@/lib/types'
import { Modal } from './overlays'
import { KindIcon } from './items'
import { cn } from './ui'

interface Row {
  id: string
  label: string
  hint?: string
  icon: React.ReactNode
  run: () => void
}

export function CommandPalette() {
  const t = useT()
  const open = useStore((s) => s.paletteOpen)
  const setPalette = useStore((s) => s.setPalette)
  const openCapture = useStore((s) => s.openCapture)
  const items = useStore((s) => s.data.items)
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setQ('')
      setSel(0)
    }
  }, [open])

  const rows = useMemo<Row[]>(() => {
    const needle = q.trim().toLowerCase()
    const close = () => setPalette(false)

    const itemRows: Row[] = Object.values(items)
      .filter((it) => !needle || it.title.toLowerCase().includes(needle))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      .slice(0, 6)
      .map((it) => ({
        id: it.id,
        label: it.title,
        hint: t.kind[it.kind],
        icon: <KindIcon kind={it.kind} />,
        run: () => {
          close()
          navigate(`/item/${it.id}`)
        },
      }))

    const actionRows: Row[] = (
      [
        [t.palette.newTask, 'task'],
        [t.palette.newEvent, 'event'],
        [t.palette.newNote, 'note'],
      ] as [string, ItemKind][]
    )
      .filter(([l]) => !needle || l.toLowerCase().includes(needle))
      .map(([label, kind]) => ({
        id: 'new-' + kind,
        label,
        icon: <Plus size={14} />,
        run: () => {
          close()
          openCapture(kind)
        },
      }))

    const viewRows: Row[] = views
      .map((v) => ({ v, name: t.nav[v.id] }))
      .filter(({ name }) => !needle || name.toLowerCase().includes(needle))
      .map(({ v, name }) => ({
        id: 'view-' + v.id,
        label: t.palette.goTo(name),
        icon: <ArrowRight size={14} />,
        run: () => {
          close()
          navigate(v.path)
        },
      }))

    const extraRows: Row[] = [
      { id: 'nav-guide', label: t.palette.goTo(t.nav.guide), to: '/guide' },
      { id: 'nav-settings', label: t.palette.goTo(t.nav.settings), to: '/settings' },
      { id: 'act-tour', label: t.palette.takeTour, to: '__tour' },
    ]
      .filter((r) => !needle || r.label.toLowerCase().includes(needle))
      .map((r) => ({
        id: r.id,
        label: r.label,
        icon: <ArrowRight size={14} />,
        run: () => {
          close()
          if (r.to === '__tour') useStore.getState().startTour()
          else navigate(r.to)
        },
      }))

    return [...itemRows, ...actionRows, ...viewRows, ...extraRows]
  }, [q, items, navigate, openCapture, setPalette, t])

  useEffect(() => {
    setSel((s) => Math.min(s, Math.max(0, rows.length - 1)))
  }, [rows.length])

  return (
    <Modal open={open} onClose={() => setPalette(false)} width={520} align="top">
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
        <Search size={15} className="text-ink-3" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setSel((s) => Math.min(s + 1, rows.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setSel((s) => Math.max(s - 1, 0))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              rows[sel]?.run()
            }
          }}
          placeholder={t.palette.placeholder}
          className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3"
        />
      </div>
      <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-1.5">
        {rows.map((r, i) => (
          <button
            key={r.id}
            onMouseEnter={() => setSel(i)}
            onClick={r.run}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[13px]',
              i === sel ? 'bg-surface-2 text-ink' : 'text-ink-2',
            )}
          >
            <span className="text-ink-3">{r.icon}</span>
            <span className="flex-1 truncate">{r.label}</span>
            {r.hint && <span className="mono text-[10px] capitalize text-ink-3">{r.hint}</span>}
          </button>
        ))}
        {rows.length === 0 && (
          <p className="px-3 py-6 text-center text-[12.5px] text-ink-3">{t.palette.noMatches}</p>
        )}
      </div>
    </Modal>
  )
}
