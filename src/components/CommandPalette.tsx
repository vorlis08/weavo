import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Plus, Search } from 'lucide-react'
import { useStore } from '@/lib/store'
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
        hint: it.kind,
        icon: <KindIcon kind={it.kind} />,
        run: () => {
          close()
          navigate(`/item/${it.id}`)
        },
      }))

    const actionRows: Row[] = (
      [
        ['New task', 'task'],
        ['New event', 'event'],
        ['New note', 'note'],
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
      .filter((v) => !needle || v.label.toLowerCase().includes(needle) || 'go to'.includes(needle))
      .map((v) => ({
        id: 'view-' + v.id,
        label: `Go to ${v.label}`,
        icon: <ArrowRight size={14} />,
        run: () => {
          close()
          navigate(v.path)
        },
      }))

    const settingsRow: Row = {
      id: 'settings',
      label: 'Go to Settings',
      icon: <ArrowRight size={14} />,
      run: () => {
        close()
        navigate('/settings')
      },
    }

    return [...itemRows, ...actionRows, ...viewRows, settingsRow]
  }, [q, items, navigate, openCapture, setPalette])

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
          placeholder="Search tasks, notes, events — or jump to a view…"
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
          <p className="px-3 py-6 text-center text-[12.5px] text-ink-3">No matches.</p>
        )}
      </div>
    </Modal>
  )
}
