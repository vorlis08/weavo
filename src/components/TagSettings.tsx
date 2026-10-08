import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { DEFAULT_SPACE, SPACE_COLOR, SPACES, TAG_COLORS } from '@/lib/types'
import type { Space, Tag } from '@/lib/types'
import { ConfirmDialog } from './overlays'
import { Dot, Segmented, cn } from './ui'

function TagRow({ tag, onDelete }: { tag: Tag; onDelete: () => void }) {
  const t = useT()
  const updateTag = useStore((s) => s.updateTag)
  const [name, setName] = useState(tag.name)
  const nextColor = () => TAG_COLORS[(TAG_COLORS.indexOf(tag.color) + 1) % TAG_COLORS.length]
  return (
    <div className="group flex items-center gap-2.5 border-t border-line py-2 first:border-0">
      <button
        onClick={() => updateTag(tag.id, { color: nextColor() })}
        className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-surface-3"
        title={t.tagSettings.title}
      >
        <Dot color={tag.color} className="h-2.5 w-2.5" />
      </button>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() && name.trim() !== tag.name && updateTag(tag.id, { name: name.trim() })}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="h-7 min-w-0 flex-1 rounded-md bg-transparent px-1.5 text-sm text-ink outline-none focus:bg-surface-2"
      />
      <label className="flex items-center gap-1.5 text-xs text-ink-3">
        {t.tagSettings.lead}
        <input
          type="number"
          min={0}
          max={14}
          value={tag.leadDays ?? 0}
          onChange={(e) => {
            const n = Math.max(0, Math.min(14, Number(e.target.value) || 0))
            updateTag(tag.id, { leadDays: n || undefined })
          }}
          className="mono h-7 w-12 rounded-md border border-line bg-surface-2 px-1.5 text-center text-sm text-ink outline-none focus:border-iris/50"
        />
        {t.tagSettings.daysShort}
      </label>
      <button onClick={onDelete} className="text-ink-3 opacity-0 hover:text-rose group-hover:opacity-100">
        <Trash2 size={13} />
      </button>
    </div>
  )
}

export function TagSettings() {
  const t = useT()
  const tags = useStore((s) => s.data.tags)
  const addTag = useStore((s) => s.addTag)
  const deleteTag = useStore((s) => s.deleteTag)
  const [space, setSpace] = useState<Space>(DEFAULT_SPACE)
  const [draft, setDraft] = useState('')
  const [toDelete, setToDelete] = useState<Tag | null>(null)
  const list = Object.values(tags)
    .filter((tg) => tg.space === space)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))

  function add() {
    const v = draft.trim()
    setDraft('')
    if (v && !list.some((tg) => tg.name.toLowerCase() === v.toLowerCase())) addTag(v, space)
  }

  return (
    <div>
      <p className="mb-3 text-xs leading-relaxed text-ink-3">{t.tagSettings.hint}</p>
      <div className="mb-2">
        <Segmented
          options={SPACES.map((sp) => ({
            value: sp,
            label: <><Dot color={SPACE_COLOR[sp]} className="h-1.5 w-1.5" />{t.spaces[sp]}</>,
          }))}
          value={space}
          onChange={setSpace}
        />
      </div>
      <div>
        {list.map((tg) => (
          <TagRow key={tg.id} tag={tg} onDelete={() => setToDelete(tg)} />
        ))}
      </div>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && add()}
        onBlur={add}
        placeholder={t.tagSettings.newTag}
        className={cn(
          'mt-2 h-8 w-full rounded-lg border border-dashed border-line-2 bg-transparent px-2.5 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-iris/50',
        )}
      />
      <ConfirmDialog
        open={!!toDelete}
        title={toDelete ? t.tagSettings.deleteTitle(toDelete.name) : ''}
        body={t.tagSettings.deleteBody}
        confirmLabel={t.common.delete}
        onConfirm={() => {
          if (toDelete) deleteTag(toDelete.id)
          setToDelete(null)
        }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}

/** which space events synced from Google land in */
export function GoogleSpaceSetting() {
  const t = useT()
  const space = useStore((s) => s.data.google.space)
  const updateGoogle = useStore((s) => s.updateGoogle)
  return (
    <div className="mt-3 flex items-center gap-3 border-t border-line pt-3 text-sm text-ink-2">
      <span className="flex-1">{t.tagSettings.googleSpace}</span>
      <Segmented
        options={SPACES.map((sp) => ({ value: sp, label: t.spaces[sp] }))}
        value={space}
        onChange={(sp) => updateGoogle({ space: sp })}
      />
    </div>
  )
}
