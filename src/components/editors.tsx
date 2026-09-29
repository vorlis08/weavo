import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { useStore } from '@/lib/store'
import type { Space } from '@/lib/types'
import { cn } from './ui'

export function InlineTitle({
  value,
  onCommit,
  placeholder,
}: {
  value: string
  onCommit: (v: string) => void
  placeholder?: string
}) {
  const t = useT()
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => setDraft(value), [value])
  useEffect(() => {
    const el = ref.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    }
  }, [draft])
  return (
    <textarea
      ref={ref}
      value={draft}
      rows={1}
      placeholder={placeholder ?? t.editors.untitled}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => draft.trim() !== value && onCommit(draft.trim() || value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          ;(e.target as HTMLTextAreaElement).blur()
        }
      }}
      className="w-full resize-none overflow-hidden bg-transparent text-2xl font-semibold leading-tight tracking-[-0.025em] text-ink outline-none placeholder:text-ink-3"
    />
  )
}

export function InlineBody({
  value,
  onCommit,
  onFollow,
  placeholder,
}: {
  value: string
  onCommit: (v: string) => void
  onFollow?: (title: string) => void
  placeholder?: string
}) {
  const t = useT()
  const ph = placeholder ?? t.editors.bodyPlaceholder
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => setDraft(value), [value])
  useEffect(() => {
    const el = ref.current
    if (el && editing) {
      el.style.height = 'auto'
      el.style.height = Math.max(el.scrollHeight, 40) + 'px'
      el.focus()
    }
  }, [draft, editing])

  if (editing) {
    return (
      <textarea
        ref={ref}
        value={draft}
        placeholder={ph}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false)
          if (draft !== value) onCommit(draft)
        }}
        className="w-full resize-none overflow-hidden rounded-lg bg-surface-2 p-2.5 text-base leading-relaxed text-ink outline-none placeholder:text-ink-3"
      />
    )
  }
  return (
    <div
      onClick={() => setEditing(true)}
      className="min-h-[1.5em] cursor-text whitespace-pre-line text-base leading-relaxed text-ink"
    >
      {value ? (
        <LinkifiedText text={value} onFollow={onFollow ?? (() => {})} />
      ) : (
        <span className="text-ink-3">{ph}</span>
      )}
    </div>
  )
}

export function PropRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 py-[7px] text-sm">
      <span className="w-[78px] shrink-0 pt-1 text-ink-3">{label}</span>
      <span className="flex min-w-0 flex-1 items-center">{children}</span>
    </div>
  )
}

/** picks Tag entities of the item's space; typing an unknown name creates the tag */
export function TagEditor({
  tags,
  space,
  onChange,
}: {
  tags: string[]
  space: Space
  onChange: (t: string[]) => void
}) {
  const tr = useT()
  const allTags = useStore((s) => s.data.tags)
  const addTag = useStore((s) => s.addTag)
  const [draft, setDraft] = useState('')
  const listId = useId()
  const available = Object.values(allTags).filter((t) => t.space === space && !tags.includes(t.id))
  function add() {
    const name = draft.trim().replace(/^#/, '')
    setDraft('')
    if (!name) return
    const existing = Object.values(allTags).find(
      (t) => t.space === space && t.name.toLowerCase() === name.toLowerCase(),
    )
    const id = existing?.id ?? addTag(name, space).id
    if (!tags.includes(id)) onChange([...tags, id])
  }
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex h-[22px] items-center gap-1.5 rounded-md bg-surface-3 pl-2 pr-1 text-xs text-ink-2"
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: allTags[tag]?.color }} />
          {allTags[tag]?.name ?? tag}
          <button
            onClick={() => onChange(tags.filter((x) => x !== tag))}
            className="text-ink-3 hover:text-rose"
          >
            <X size={11} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            add()
          } else if (e.key === 'Backspace' && !draft && tags.length) {
            onChange(tags.slice(0, -1))
          }
        }}
        onBlur={add}
        list={listId}
        placeholder={tags.length ? '' : tr.editors.addTag}
        className="h-[22px] w-20 min-w-[60px] flex-1 bg-transparent text-xs text-ink outline-none placeholder:text-ink-3"
      />
      <datalist id={listId}>
        {available.map((t) => (
          <option key={t.id} value={t.name} />
        ))}
      </datalist>
    </span>
  )
}

export function LinkifiedText({
  text,
  onFollow,
}: {
  text: string
  onFollow: (title: string) => void
}) {
  const parts = text.split(/(\[\[[^\]]+\]\])/g)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('[[') && p.endsWith(']]') ? (
          <button
            key={i}
            onClick={() => onFollow(p.slice(2, -2).trim())}
            className={cn('text-iris-2 hover:underline')}
          >
            {p.slice(2, -2)}
          </button>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  )
}
