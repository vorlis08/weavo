import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import type { Item } from '@/lib/types'
import { Checkbox, cn } from './ui'

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)

export type Step = NonNullable<Item['checklist']>[number]

/** a stored task's steps */
export function Steps({ item }: { item: Item }) {
  const updateItem = useStore((s) => s.updateItem)
  return <StepsList steps={item.checklist ?? []} onChange={(checklist) => updateItem(item.id, { checklist })} />
}

/** a checklist: tick, rename in place, remove, add */
export function StepsList({ steps, onChange }: { steps: Step[]; onChange: (steps: Step[]) => void }) {
  const t = useT()
  const [draft, setDraft] = useState('')
  const set = onChange

  function add() {
    const v = draft.trim()
    if (v) set([...steps, { id: uid(), text: v, done: false }])
    setDraft('')
  }

  return (
    <div className="flex flex-col">
      {steps.map((s) => (
        <div key={s.id} className="group flex min-h-10 items-center gap-3 rounded-lg px-1.5 hover:bg-surface-2">
          <Checkbox
            size="sm"
            checked={s.done}
            onChange={() => set(steps.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)))}
          />
          <input
            value={s.text}
            onChange={(e) => set(steps.map((x) => (x.id === s.id ? { ...x, text: e.target.value } : x)))}
            className={cn(
              'min-w-0 flex-1 bg-transparent text-base outline-none',
              s.done && 'text-ink-3 line-through decoration-ink-4',
            )}
          />
          <button
            onClick={() => set(steps.filter((x) => x.id !== s.id))}
            className="text-ink-4 opacity-0 transition-opacity hover:text-rose group-hover:opacity-100 max-md:opacity-100"
            aria-label={t.common.delete}
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <label className="flex min-h-10 items-center gap-3 rounded-lg px-1.5 text-ink-3 hover:bg-surface-2">
        <span className="flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full border-[1.6px] border-dashed border-ink-4">
          <Plus size={10} strokeWidth={2.6} />
        </span>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          onBlur={add}
          placeholder={steps.length ? t.drawer.addStep : t.drawer.splitSteps}
          className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-3"
        />
      </label>
    </div>
  )
}
