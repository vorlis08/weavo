import { useState } from 'react'
import { Bell, Plus, X } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { dateLocale, toLocalInput } from '@/lib/date'
import { makeRule } from '@/lib/recur'
import { triggerKey } from '@/lib/reminders'
import type { ItemKind, RepeatFreq, RepeatRule, ReminderTrigger } from '@/lib/types'
import { Menu } from './overlays'
import { Select, TextField, cn } from './ui'

const inline = 'h-7 w-auto text-sm'
const FREQS: RepeatFreq[] = ['daily', 'weekdays', 'weekly', 'monthly', 'yearly']

/** repeat rule: pick a frequency, then "every N", weekdays and an end date */
export function RepeatField({ value, onChange }: { value?: RepeatRule; onChange: (r?: RepeatRule) => void }) {
  const t = useT()
  const set = (patch: Partial<RepeatRule>) => value && onChange({ ...value, ...patch })
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
      <Select
        className={cn(inline, 'min-w-[150px]')}
        value={value?.freq ?? 'none'}
        onChange={(e) => {
          const v = e.target.value
          if (v === 'none') return onChange(undefined)
          const freq = v as RepeatFreq
          onChange(makeRule(freq, { until: value?.until, days: freq === 'weekly' ? value?.days : undefined }))
        }}
      >
        <option value="none">{t.repeat.none}</option>
        {FREQS.map((f) => (
          <option key={f} value={f}>
            {t.repeat[f]}
          </option>
        ))}
      </Select>
      {value && value.freq !== 'weekdays' && (
        <span className="flex items-center gap-1.5 text-sm text-ink-3">
          {t.repeat.every}
          <TextField
            type="number"
            min={1}
            max={99}
            value={value.interval}
            onChange={(e) => set({ interval: Math.max(1, Math.min(99, Number(e.target.value) || 1)) })}
            className={cn(inline, 'w-14 px-2')}
          />
          {t.repeat.unit(value.freq, value.interval)}
        </span>
      )}
      {value?.freq === 'weekly' && (
        <span className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => {
            const on = value.days?.includes(d)
            return (
              <button
                key={d}
                type="button"
                onClick={() => {
                  const days = on ? (value.days ?? []).filter((x) => x !== d) : [...(value.days ?? []), d]
                  set({ days: days.length ? days : undefined })
                }}
                aria-pressed={!!on}
                className={cn(
                  'h-7 min-w-7 rounded-md border px-1 text-xs transition-colors',
                  on
                    ? 'border-ink-3 bg-surface-3 text-ink'
                    : 'border-line text-ink-3 hover:border-line-3 hover:text-ink',
                )}
              >
                {t.repeat.weekdaysShort[d]}
              </button>
            )
          })}
        </span>
      )}
      {value && (
        <span className="flex items-center gap-1.5 text-sm text-ink-3">
          {t.repeat.until}
          <TextField
            type="date"
            value={value.until ? value.until.slice(0, 10) : ''}
            onChange={(e) => set({ until: e.target.value || undefined })}
            className={cn(inline, 'px-2')}
            aria-label={t.repeat.until}
          />
          {!value.until && <span className="text-ink-4">{t.repeat.noEnd.toLowerCase()}</span>}
        </span>
      )}
    </div>
  )
}

export interface ReminderEntry {
  id: string
  trigger: ReminderTrigger
  firedAt?: string
}

function human(t: ReturnType<typeof useT>, m: number) {
  if (m >= 1440 && m % 1440 === 0) return t.remind.days(m / 1440)
  if (m >= 60 && m % 60 === 0) return t.remind.hours(m / 60)
  return t.remind.minutes(m)
}

export function triggerLabel(t: ReturnType<typeof useT>, tr: ReminderTrigger, kind: ItemKind) {
  if (tr.type === 'at')
    return new Date(tr.at).toLocaleString(dateLocale(), {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  if (tr.type === 'on_day') return kind === 'event' ? t.remind.onDayEvent(tr.time) : t.remind.onDay(tr.time)
  if (tr.minutes === 0) return kind === 'event' ? t.remind.atStart : t.remind.atTime
  return t.remind.before(human(t, tr.minutes))
}

const MINUTE_PRESETS = [0, 5, 10, 15, 30, 60, 120, 1440, 2880]
const DAY_TIMES = ['08:00', '09:00', '12:00', '18:00']

/** the reminders of an item: several at once, each removable, plus an add menu */
export function RemindersField({
  kind,
  entries,
  hasDate = true,
  onAdd,
  onRemove,
}: {
  kind: ItemKind
  entries: ReminderEntry[]
  /** without a date only a fixed time makes sense */
  hasDate?: boolean
  onAdd: (t: ReminderTrigger) => void
  onRemove: (id: string) => void
}) {
  const t = useT()
  const [custom, setCustom] = useState(false)
  const have = new Set(entries.map((e) => triggerKey(e.trigger)))
  const rel = (minutes: number): ReminderTrigger =>
    kind === 'event' ? { type: 'before_start', minutes } : { type: 'before_due', minutes }
  const items = (
    hasDate
      ? [...MINUTE_PRESETS.map((m) => rel(m)), ...DAY_TIMES.map((time): ReminderTrigger => ({ type: 'on_day', time }))]
      : []
  )
    .filter((tr) => !have.has(triggerKey(tr)))
    .map((tr) => ({ label: triggerLabel(t, tr, kind), onSelect: () => onAdd(tr) }))
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {entries.map((e) => (
        <span
          key={e.id}
          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line-2 bg-surface pl-2 pr-1 text-sm text-ink"
        >
          <Bell size={12} className="text-ink-3" />
          {triggerLabel(t, e.trigger, kind)}
          {e.firedAt && <span className="text-xs text-amber">{t.remind.fired}</span>}
          <button
            type="button"
            onClick={() => onRemove(e.id)}
            className="flex h-5 w-5 items-center justify-center rounded text-ink-4 hover:bg-surface-3 hover:text-rose"
            aria-label={t.common.delete}
          >
            <X size={12} />
          </button>
        </span>
      ))}
      {custom && (
        <TextField
          type="datetime-local"
          autoFocus
          defaultValue={toLocalInput(new Date(Date.now() + 3_600_000))}
          onBlur={() => setCustom(false)}
          onChange={(e) => {
            if (!e.target.value) return
            onAdd({ type: 'at', at: new Date(e.target.value).toISOString() })
            setCustom(false)
          }}
          className={cn(inline, 'px-2')}
        />
      )}
      <Menu
        trigger={({ toggle }) => (
          <button
            type="button"
            onClick={toggle}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-dashed border-line-2 px-2 text-sm text-ink-3 transition-colors hover:border-line-3 hover:text-ink"
          >
            <Plus size={12} />
            {entries.length ? t.common.add : t.remind.add}
          </button>
        )}
        items={[
          ...items,
          ...(items.length ? ['separator' as const] : []),
          { label: t.remind.custom, onSelect: () => setCustom(true) },
        ]}
      />
    </div>
  )
}
