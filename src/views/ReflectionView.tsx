import { useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Card, Page } from '@/components/Page'
import { ReflectionTabs } from '@/components/ReflectionTabs'
import { cn } from '@/components/ui'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { dayActivity } from '@/lib/selectors'
import { addDays, dateLocale, fmtLongDate } from '@/lib/date'
import type { Reflection } from '@/lib/types'

type Mood = 1 | 2 | 3 | 4 | 5
/** rough → great, rose through ochre to jade */
export const MOOD_COLOR: Record<Mood, string> = {
  1: '#f2838f',
  2: '#e9a07a',
  3: '#e7b45f',
  4: '#a9c77e',
  5: '#6fd0b0',
}

export function dateKey(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** five named steps instead of emoji faces */
export function MoodPicker({ value, onChange }: { value?: Mood; onChange: (v: Mood) => void }) {
  const t = useT()
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {([1, 2, 3, 4, 5] as Mood[]).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          aria-pressed={value === m}
          className={cn(
            'flex flex-col items-center gap-2 rounded-xl border px-1 py-2.5 text-sm transition-colors',
            value === m ? 'border-line-3 bg-surface-3 text-ink' : 'border-line text-ink-3 hover:border-line-2 hover:text-ink-2',
          )}
        >
          <span
            className="h-3 w-3 rounded-full transition-transform"
            style={{ background: MOOD_COLOR[m], transform: value === m ? 'scale(1.25)' : undefined, opacity: value && value !== m ? 0.45 : 1 }}
          />
          {t.reflection.moods[m - 1]}
        </button>
      ))}
    </div>
  )
}

function TodayCard() {
  const t = useT()
  const data = useStore((s) => s.data)
  const upsertReflection = useStore((s) => s.upsertReflection)
  const today = new Date()
  const key = dateKey(today)
  const entry = data.reflections[key]
  const [draft, setDraft] = useState(entry?.note ?? '')
  const activity = dayActivity(data, today)

  return (
    <Card>
      <h2 className="display text-xl">{t.reflection.todayTitle}</h2>
      <p className="mt-1 text-sm text-ink-3">
        {activity.completed.length === 0 && activity.events.length === 0
          ? t.reflection.summaryNone
          : [
              activity.completed.length ? t.reflection.summaryTasks(activity.completed.length) : '',
              activity.events.length ? t.reflection.summaryEvents(activity.events.length) : '',
            ]
              .filter(Boolean)
              .join(' · ')}
      </p>
      <div className="mt-5">
        <MoodPicker value={entry?.mood} onChange={(v) => upsertReflection(key, { mood: v })} />
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== (entry?.note ?? '') && upsertReflection(key, { note: draft })}
        placeholder={t.reflection.notePlaceholder}
        rows={4}
        className="mt-4 w-full resize-y rounded-xl border border-line-2 bg-bg/50 p-3.5 text-base leading-relaxed text-ink outline-none placeholder:text-ink-3 focus:border-iris/60"
      />
    </Card>
  )
}

/** fourteen days of mood as bars — height and color both say how the day was */
function MoodStrip() {
  const t = useT()
  const reflections = useStore((s) => s.data.reflections)
  const today = new Date()
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13))
  return (
    <Card title={t.reflection.last14}>
      <div className="grid h-24 items-end gap-1.5" style={{ gridTemplateColumns: 'repeat(14, minmax(0, 1fr))' }}>
        {days.map((d) => {
          const mood = reflections[dateKey(d)]?.mood as Mood | undefined
          return (
            <div
              key={d.toISOString()}
              title={`${fmtLongDate(d)} · ${mood ? t.reflection.moods[mood - 1] : t.reflection.noMood}`}
              className="rounded-md"
              style={{
                height: mood ? `${20 + mood * 16}%` : 6,
                background: mood ? MOOD_COLOR[mood] : 'var(--color-surface-3)',
                opacity: mood ? 0.9 : 1,
              }}
            />
          )
        })}
      </div>
      <div className="mt-2 grid gap-1.5 text-center text-[11px] text-ink-3" style={{ gridTemplateColumns: 'repeat(14, minmax(0, 1fr))' }}>
        {days.map((d) => (
          <span key={d.toISOString()} className={cn(dateKey(d) === dateKey(today) && 'font-semibold text-iris-2')}>
            {d.toLocaleDateString(dateLocale(), { weekday: 'narrow' })}
          </span>
        ))}
      </div>
    </Card>
  )
}

function HistoryRow({ entry }: { entry: Reflection }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const d = new Date(entry.date + 'T00:00')
  const mood = entry.mood as Mood | undefined
  return (
    <div className="border-b border-line">
      <button onClick={() => setOpen((v) => !v)} className="flex min-h-12 w-full items-center gap-3 px-2 text-left" aria-expanded={open}>
        <ChevronRight size={14} className={cn('shrink-0 text-ink-3 transition-transform', open && 'rotate-90')} />
        <span className="w-[170px] shrink-0 text-sm text-ink-2 max-sm:w-[130px]">{fmtLongDate(d)}</span>
        {mood && (
          <span className="flex shrink-0 items-center gap-1.5 text-sm text-ink-3">
            <i className="h-2.5 w-2.5 rounded-full" style={{ background: MOOD_COLOR[mood] }} />
            {t.reflection.moods[mood - 1]}
          </span>
        )}
        {!open && entry.note && <span className="min-w-0 flex-1 truncate text-sm text-ink-3">{entry.note}</span>}
      </button>
      {open && (
        <div className="pb-4 pl-9 pr-2 text-base leading-relaxed text-ink-2">
          {entry.note ? <p className="whitespace-pre-line">{entry.note}</p> : <p className="text-ink-3">{t.reflection.noNote}</p>}
        </div>
      )}
    </div>
  )
}

export function ReflectionView() {
  const t = useT()
  const reflections = useStore((s) => s.data.reflections)
  const todayKey = dateKey(new Date())
  const history = useMemo(
    () =>
      Object.values(reflections)
        .filter((r) => r.date !== todayKey && (r.note || r.mood))
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [reflections, todayKey],
  )

  return (
    <Page eyebrow={fmtLongDate(new Date())} title={t.nav.reflection} actions={<ReflectionTabs />} width="narrow">
      <div className="flex flex-col gap-3.5">
        <TodayCard />
        <MoodStrip />
      </div>
      <h3 className="mb-2 mt-9 px-2 text-sm font-semibold text-ink-2">{t.reflection.historyTitle}</h3>
      {history.length === 0 ? (
        <p className="px-2 text-base text-ink-3">{t.reflection.emptyHistory}</p>
      ) : (
        <div className="border-t border-line">
          {history.map((r) => (
            <HistoryRow key={r.id} entry={r} />
          ))}
        </div>
      )}
    </Page>
  )
}
